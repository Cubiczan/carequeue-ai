"""
CFO Resilience Matrix — Data Curation Package
===============================================

Inference log collection, failure taxonomy classification, and training
data curation for fine-tuning small language models on CFO domain data.

Inspired by Pioneer Agent's closed-loop adaptation:
  1. **Collect** — InferenceLogCollector captures every agent call
  2. **Diagnose** — FailureTaxonomy classifies failures into categories
  3. **Curate** — DataCurator builds training / eval / regression sets
  4. **Train**  — FinetunePipeline integrates axolotl / unsloth
  5. **Evaluate** — Regression guard via chaos engine + 94 tests
"""

from __future__ import annotations

from curate.log_collector import InferenceLogCollector, InferenceLogEntry
from curate.failure_taxonomy import (
    FailureCategory,
    FailureDiagnosis,
    FailureTaxonomy,
)
from curate.data_curator import (
    DataCurator,
    TrainingExample,
    DatasetSplit,
    CuratorStats,
)
from curate.curate_layer import DataCurationLayer
from curate.finetune_pipeline import FinetunePipeline, FinetuneConfig

__all__ = [
    "InferenceLogCollector",
    "InferenceLogEntry",
    "FailureCategory",
    "FailureDiagnosis",
    "FailureTaxonomy",
    "DataCurator",
    "TrainingExample",
    "DatasetSplit",
    "CuratorStats",
    "DataCurationLayer",
    "FinetunePipeline",
    "FinetuneConfig",
]
