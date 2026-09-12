"""
curate.data_curator — Training Data Curation
============================================

Builds structured training datasets from collected inference logs, implementing
Pioneer Agent's curriculum synthesis concept.  Separates data into:

- **Training set** — High-quality examples for fine-tuning
- **Eval set** — Held-out examples for validation during training
- **Regression set** — Examples that must always pass (no regression)
- **Failure set** — Classified failures for targeted improvement

The curator applies quality filters, balancing, and deduplication to produce
clean datasets suitable for fine-tuning with axolotl or unsloth.

Usage
-----
::

    curator = DataCurator(collector, taxonomy)
    curator.curate()
    stats = curator.get_stats()
    curator.export_jsonl("output_dir/")
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import random
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

from curate.failure_taxonomy import FailureCategory, FailureDiagnosis, FailureTaxonomy
from curate.log_collector import InferenceLogCollector, InferenceLogEntry

logger = logging.getLogger("cfo_resilience.curate.curator")


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class TrainingExample:
    """A single training example in chat format.

    Attributes
    ----------
    example_id : str
        Unique identifier.
    messages : list[dict[str, str]]
        Chat-format messages (system, user, assistant).
    source : str
        Where this example came from (e.g. "inference_log", "synthetic").
    agent_name : str
        Agent that produced this example.
    quality_score : float
        Computed quality score (0.0-1.0).
    category : str
        Category label (e.g. "positive", "failure_fix").
    metadata : dict[str, Any]
        Additional metadata.
    """

    example_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    messages: list[dict[str, str]] = field(default_factory=list)
    source: str = "inference_log"
    agent_name: str = ""
    quality_score: float = 0.0
    category: str = "positive"
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_chat_format(self) -> dict[str, Any]:
        """Return in the format expected by fine-tuning frameworks."""
        return {"messages": self.messages}

    def content_hash(self) -> str:
        """Hash of the messages for deduplication."""
        content = json.dumps(self.messages, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(content.encode()).hexdigest()[:16]


@dataclass
class DatasetSplit:
    """A named split of the curated dataset."""

    name: str
    examples: list[TrainingExample] = field(default_factory=list)

    def to_jsonl(self, path: Path | str) -> int:
        """Write examples to a JSONL file."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        count = 0
        with open(path, "w") as f:
            for ex in self.examples:
                f.write(json.dumps(ex.to_chat_format(), ensure_ascii=False) + "\n")
                count += 1
        logger.info("Wrote %d examples to %s", count, path)
        return count

    def __len__(self) -> int:
        return len(self.examples)


@dataclass
class CuratorStats:
    """Statistics about the data curation process."""

    total_log_entries: int = 0
    positive_examples: int = 0
    failure_examples: int = 0
    regression_examples: int = 0
    dedup_removed: int = 0
    train_count: int = 0
    eval_count: int = 0
    regression_set_count: int = 0
    failure_set_count: int = 0
    category_distribution: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Data Curator
# ---------------------------------------------------------------------------


class DataCurator:
    """Curates training datasets from inference logs.

    Implements Pioneer Agent's curriculum synthesis:
    1. Classify each log entry (positive / failure / regression)
    2. Diagnose failures and group by category
    3. Filter, deduplicate, and balance the dataset
    4. Split into train/eval/regression/failure sets

    Parameters
    ----------
    collector : InferenceLogCollector
        The inference log data source.
    taxonomy : FailureTaxonomy
        The failure taxonomy classifier.
    train_eval_split : float
        Fraction of positive examples for training (rest goes to eval).
    seed : int | None
        Random seed for reproducibility.
    """

    def __init__(
        self,
        collector: InferenceLogCollector,
        taxonomy: FailureTaxonomy,
        train_eval_split: float = 0.85,
        seed: int | None = 42,
    ) -> None:
        self._collector = collector
        self._taxonomy = taxonomy
        self._train_eval_split = train_eval_split
        self._rng = random.Random(seed)

        self._train_split = DatasetSplit("train")
        self._eval_split = DatasetSplit("eval")
        self._regression_split = DatasetSplit("regression")
        self._failure_split = DatasetSplit("failure")
        self._stats = CuratorStats()

    def curate(
        self,
        min_quality_score: float = 0.6,
        min_response_length: int = 50,
        max_response_length: int = 8000,
        deduplicate: bool = True,
    ) -> CuratorStats:
        """Run the full curation pipeline.

        Parameters
        ----------
        min_quality_score : float
            Minimum quality score for training examples.
        min_response_length : int
            Minimum response length in characters.
        max_response_length : int
            Maximum response length in characters.
        deduplicate : bool
            Whether to remove duplicate examples based on content hash.

        Returns
        -------
        CuratorStats
            Statistics about the curation process.
        """
        entries = self._collector.get_entries()
        self._stats.total_log_entries = len(entries)
        logger.info("Curating from %d log entries", len(entries))

        # Reset splits
        self._train_split = DatasetSplit("train")
        self._eval_split = DatasetSplit("eval")
        self._regression_split = DatasetSplit("regression")
        self._failure_split = DatasetSplit("failure")

        seen_hashes: set[str] = set()
        all_positive: list[TrainingExample] = []
        all_regression: list[TrainingExample] = []
        all_failure: list[TrainingExample] = []

        for entry in entries:
            # Skip entries that are too short
            if len(entry.response.strip()) < min_response_length:
                continue
            if len(entry.response) > max_response_length:
                # Truncate
                entry.response = entry.response[:max_response_length]

            # Diagnose failures
            diagnosis = self._taxonomy.diagnose(
                verdict=entry.verdict,
                confidence=entry.confidence,
                degradation_level=entry.degradation_level,
                decision_state=entry.decision_state,
                event_types=entry.event_types,
                pii_flags=entry.pii_flags,
                response=entry.response,
                prompt=entry.prompt,
                providers_tried=entry.providers_tried,
            )

            # Build training example
            example = self._entry_to_example(entry, diagnosis)

            # Deduplicate
            if deduplicate:
                content_hash = example.content_hash()
                if content_hash in seen_hashes:
                    self._stats.dedup_removed += 1
                    continue
                seen_hashes.add(content_hash)

            # Classify
            if entry.is_high_quality and example.quality_score >= min_quality_score:
                all_positive.append(example)
                self._stats.positive_examples += 1
            elif entry.is_regression_candidate:
                all_regression.append(example)
                self._stats.regression_examples += 1
            elif entry.is_failure or diagnosis.category != FailureCategory.UNKNOWN:
                all_failure.append(example)
                self._stats.failure_examples += 1

            # Track category distribution
            cat = diagnosis.category.value
            self._stats.category_distribution[cat] = (
                self._stats.category_distribution.get(cat, 0) + 1
            )

        # Shuffle and split
        self._rng.shuffle(all_positive)
        self._rng.shuffle(all_regression)
        self._rng.shuffle(all_failure)

        split_idx = max(1, int(len(all_positive) * self._train_eval_split))
        self._train_split.examples = all_positive[:split_idx]
        self._eval_split.examples = all_positive[split_idx:]
        self._regression_split.examples = all_regression
        self._failure_split.examples = all_failure

        self._stats.train_count = len(self._train_split)
        self._stats.eval_count = len(self._eval_split)
        self._stats.regression_set_count = len(self._regression_split)
        self._stats.failure_set_count = len(self._failure_split)

        logger.info(
            "Curation complete: train=%d, eval=%d, regression=%d, failure=%d, dedup=%d",
            self._stats.train_count,
            self._stats.eval_count,
            self._stats.regression_set_count,
            self._stats.failure_set_count,
            self._stats.dedup_removed,
        )

        return self._stats

    def _entry_to_example(
        self, entry: InferenceLogEntry, diagnosis: FailureDiagnosis
    ) -> TrainingExample:
        """Convert a log entry + diagnosis into a TrainingExample."""
        messages: list[dict[str, str]] = []
        if entry.system_prompt:
            messages.append({"role": "system", "content": entry.system_prompt})
        messages.append({"role": "user", "content": entry.prompt})

        # For failures, include the corrected version as the assistant response
        if entry.is_failure:
            # The response may be degraded — include it with a correction note
            if entry.response and len(entry.response.strip()) > 20:
                messages.append({"role": "assistant", "content": entry.response})
            category = f"failure_{diagnosis.category.value}"
        else:
            messages.append({"role": "assistant", "content": entry.response})
            category = "positive"

        # Compute quality score
        quality_score = self._compute_quality_score(entry, diagnosis)

        return TrainingExample(
            example_id=entry.entry_id,
            messages=messages,
            source="inference_log",
            agent_name=entry.agent_name,
            quality_score=quality_score,
            category=category,
            metadata={
                "confidence": entry.confidence,
                "verdict": entry.verdict,
                "degradation_level": entry.degradation_level,
                "decision_state": entry.decision_state,
                "failure_category": diagnosis.category.value,
                "failure_severity": diagnosis.severity.value,
                "pii_flags": entry.pii_flags,
                "event_types": entry.event_types,
            },
        )

    @staticmethod
    def _compute_quality_score(
        entry: InferenceLogEntry, diagnosis: FailureDiagnosis
    ) -> float:
        """Compute a composite quality score for a training example."""
        score = 0.0

        # Confidence component (40%)
        score += 0.4 * entry.confidence

        # Response length (20%) — penalize very short responses
        length_score = min(len(entry.response) / 500.0, 1.0)
        score += 0.2 * length_score

        # Verdict component (20%)
        if entry.verdict == "ALLOW":
            score += 0.2
        elif entry.verdict == "DEGRADE":
            score += 0.1

        # Degradation component (10%)
        score += 0.1 * (1.0 - entry.degradation_level / 2.0)

        # Decision state component (10%)
        if entry.decision_state == "LOCKED":
            score += 0.1
        elif entry.decision_state == "PROVISIONAL":
            score += 0.07
        elif entry.decision_state == "EXPLORING":
            score += 0.03

        # PII penalty
        if entry.pii_flags:
            score -= 0.05 * min(len(entry.pii_flags), 3)

        # Failure severity penalty
        severity_penalty = {
            "LOW": 0.0,
            "MEDIUM": 0.1,
            "HIGH": 0.2,
            "CRITICAL": 0.3,
        }
        score -= severity_penalty.get(diagnosis.severity.value, 0.0)

        return round(max(0.0, min(1.0, score)), 3)

    @property
    def train_split(self) -> DatasetSplit:
        return self._train_split

    @property
    def eval_split(self) -> DatasetSplit:
        return self._eval_split

    @property
    def regression_split(self) -> DatasetSplit:
        return self._regression_split

    @property
    def failure_split(self) -> DatasetSplit:
        return self._failure_split

    def get_stats(self) -> CuratorStats:
        return self._stats

    def export_all(
        self,
        output_dir: Path | str,
    ) -> dict[str, int]:
        """Export all splits to JSONL files in the given directory.

        Returns a dict with split names and file paths.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        results: dict[str, int] = {}
        for split in [
            self._train_split,
            self._eval_split,
            self._regression_split,
            self._failure_split,
        ]:
            if split.examples:
                path = output_dir / f"{split.name}.jsonl"
                count = split.to_jsonl(path)
                results[split.name] = count

        # Export stats
        stats_path = output_dir / "curation_stats.json"
        with open(stats_path, "w") as f:
            json.dump(self._stats.to_dict(), f, indent=2, ensure_ascii=False)
        logger.info("Exported curation stats to %s", stats_path)

        return results

    def __repr__(self) -> str:
        return (
            f"DataCurator(positive={self._stats.positive_examples}, "
            f"failure={self._stats.failure_examples}, "
            f"regression={self._stats.regression_examples})"
        )
