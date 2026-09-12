"""Tests for the Data Curation package (Layer 6)."""

from __future__ import annotations

import json
import pytest
from pathlib import Path

from curate.log_collector import InferenceLogCollector, InferenceLogEntry
from curate.failure_taxonomy import (
    FailureCategory,
    FailureDiagnosis,
    FailureSeverity,
    FailureTaxonomy,
)
from curate.data_curator import DataCurator, TrainingExample, CuratorStats
from curate.curate_layer import DataCurationLayer
from curate.finetune_pipeline import FinetunePipeline, FinetuneConfig
from gateway.client import ResilientGatewayClient
from layers.resilience_stack import (
    ResilienceContext,
    LayerVerdict,
    DecisionState,
    ResilienceLayer,
    ResilienceStack,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_client() -> ResilientGatewayClient:
    return ResilientGatewayClient(
        gateway_url="https://gateway.truefoundry.ai",
        api_key="",  # mock mode
        virtual_model="test-model",
        timeout_seconds=5,
    )


def _make_good_entry(**overrides) -> InferenceLogEntry:
    defaults = {
        "agent_name": "finance",
        "prompt": "What is our cash runway?",
        "system_prompt": "You are a finance assistant.",
        "response": "Based on current burn rate of $150K/month and cash reserves of $2.1M, the company has approximately 14 months of runway. Key factors include: 1. Monthly recurring revenue growth of 8% provides a modest buffer. 2. Operating expenses should be monitored closely. 3. Consider extending runway through cost optimization or revenue acceleration.",
        "confidence": 0.92,
        "verdict": "ALLOW",
        "degradation_level": 0,
        "decision_state": "LOCKED",
        "latency_ms": 245.3,
        "model": "cfo-resilience/primary",
    }
    defaults.update(overrides)
    return InferenceLogEntry(**defaults)


def _make_failure_entry(**overrides) -> InferenceLogEntry:
    defaults = {
        "agent_name": "finance",
        "prompt": "What is our cash runway?",
        "system_prompt": "You are a finance assistant.",
        "response": "",  # Empty response
        "confidence": 0.15,
        "verdict": "DEGRADE",
        "degradation_level": 2,
        "decision_state": "HALT",
        "latency_ms": 8500.0,
        "model": "cfo-resilience/fallback-2",
        "event_types": ["FAILOVER", "RETRY", "RETRY", "RETRY", "DEGRADE"],
        "providers_tried": ["primary", "fallback-1", "fallback-2"],
    }
    defaults.update(overrides)
    return InferenceLogEntry(**defaults)


# ---------------------------------------------------------------------------
# InferenceLogEntry
# ---------------------------------------------------------------------------


class TestInferenceLogEntry:
    def test_default_values(self):
        entry = InferenceLogEntry()
        assert entry.prompt == ""
        assert entry.confidence == 1.0
        assert entry.verdict == "ALLOW"
        assert entry.degradation_level == 0
        assert entry.decision_state == "EXPLORING"

    def test_is_failure_true(self):
        entry = InferenceLogEntry(
            verdict="BLOCK", confidence=0.1, degradation_level=2,
            decision_state="HALT",
        )
        assert entry.is_failure is True

    def test_is_failure_false(self):
        entry = InferenceLogEntry(
            confidence=0.9, verdict="ALLOW",
        )
        assert entry.is_failure is False

    def test_is_high_quality_true(self):
        entry = _make_good_entry()
        assert entry.is_high_quality is True

    def test_is_high_quality_false_low_confidence(self):
        entry = InferenceLogEntry(
            response="x" * 200, confidence=0.6, verdict="ALLOW",
            degradation_level=0, decision_state="PROVISIONAL",
        )
        assert entry.is_high_quality is False

    def test_is_high_quality_false_blocked(self):
        entry = InferenceLogEntry(verdict="BLOCK")
        assert entry.is_high_quality is False

    def test_is_regression_candidate(self):
        entry = _make_good_entry(confidence=0.75, decision_state="PROVISIONAL")
        assert entry.is_regression_candidate is True

    def test_to_dict(self):
        entry = _make_good_entry()
        d = entry.to_dict()
        assert d["agent_name"] == "finance"
        assert d["confidence"] == 0.92
        assert "entry_id" in d
        assert "timestamp" in d


# ---------------------------------------------------------------------------
# InferenceLogCollector
# ---------------------------------------------------------------------------


class TestInferenceLogCollector:
    def test_log_and_retrieve(self):
        collector = InferenceLogCollector()
        entry = collector.log(
            prompt="test prompt", response="test response",
            agent_name="finance",
        )
        assert collector.entry_count == 1
        assert entry.prompt == "test prompt"

    def test_get_entries_unfiltered(self):
        collector = InferenceLogCollector()
        collector.log(prompt="a", response="b")
        collector.log(prompt="c", response="d")
        entries = collector.get_entries()
        assert len(entries) == 2

    def test_get_entries_filtered_by_agent(self):
        collector = InferenceLogCollector()
        collector.log(prompt="a", response="b", agent_name="finance")
        collector.log(prompt="c", response="d", agent_name="strategy")
        entries = collector.get_entries(agent_name="finance")
        assert len(entries) == 1
        assert entries[0].agent_name == "finance"

    def test_get_entries_failures_only(self):
        collector = InferenceLogCollector()
        collector.log(prompt="good", response="x" * 200, confidence=0.9, verdict="ALLOW")
        collector.log(prompt="bad", response="", confidence=0.1, verdict="BLOCK", degradation_level=2, decision_state="HALT")
        failures = collector.get_entries(failures_only=True)
        assert len(failures) == 1

    def test_get_entries_high_quality(self):
        collector = InferenceLogCollector()
        collector.log(prompt="a", response="x" * 200, confidence=0.9, verdict="ALLOW",
                      degradation_level=0, decision_state="LOCKED")
        hq = collector.get_entries(high_quality_only=True)
        assert len(hq) == 1

    def test_get_stats_empty(self):
        collector = InferenceLogCollector()
        stats = collector.get_stats()
        assert stats["total_entries"] == 0

    def test_get_stats_populated(self):
        collector = InferenceLogCollector()
        collector.log(prompt="good", response="x" * 200, confidence=0.9, verdict="ALLOW",
                      degradation_level=0, decision_state="LOCKED", agent_name="finance")
        collector.log(prompt="bad", response="", confidence=0.1, verdict="BLOCK",
                      degradation_level=2, decision_state="HALT", agent_name="strategy")
        stats = collector.get_stats()
        assert stats["total_entries"] == 2
        assert stats["failure_count"] == 1
        assert stats["high_quality_count"] == 1

    def test_ring_buffer(self):
        collector = InferenceLogCollector(max_entries=5)
        for i in range(10):
            collector.log(prompt=f"prompt_{i}", response=f"response_{i}")
        assert collector.entry_count == 5

    def test_clear(self):
        collector = InferenceLogCollector()
        collector.log(prompt="a", response="b")
        collector.clear()
        assert collector.entry_count == 0

    def test_repr(self):
        collector = InferenceLogCollector()
        assert "entries=0" in repr(collector)

    def test_export_trainable(self, tmp_path):
        collector = InferenceLogCollector()
        collector.log(
            prompt="What is runway?", system_prompt="You are a CFO.",
            response="Cash runway is 14 months based on current burn rate.",
            confidence=0.9, verdict="ALLOW", degradation_level=0,
            decision_state="LOCKED",
        )
        path = tmp_path / "train.jsonl"
        count = collector.export_trainable(path, min_confidence=0.8)
        assert count == 1
        with open(path) as f:
            data = json.loads(f.readline())
        assert len(data["messages"]) == 3  # system + user + assistant
        assert data["messages"][1]["role"] == "user"
        assert data["messages"][2]["role"] == "assistant"


# ---------------------------------------------------------------------------
# FailureTaxonomy
# ---------------------------------------------------------------------------


class TestFailureTaxonomy:
    def test_diagnose_pii_leak(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(
            verdict="BLOCK",
            pii_flags=["SSN (1)", "Email (1)"],
        )
        assert diagnosis.category == FailureCategory.PII_LEAK
        assert diagnosis.severity == FailureSeverity.HIGH

    def test_diagnose_state_halt(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(
            verdict="DEGRADE",
            decision_state="HALT",
            confidence=0.2,
        )
        assert diagnosis.category == FailureCategory.STATE_HALT
        assert diagnosis.severity in (FailureSeverity.HIGH, FailureSeverity.CRITICAL)

    def test_diagnose_rate_limited(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(
            verdict="ALLOW",
            event_types=["RETRY", "429"],
            confidence=0.5,
        )
        assert diagnosis.category == FailureCategory.RATE_LIMITED

    def test_diagnose_provider_outage(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(
            verdict="DEGRADE",
            event_types=["FAILOVER"],
            providers_tried=["primary", "fallback-1"],
        )
        assert diagnosis.category == FailureCategory.PROVIDER_OUTAGE

    def test_diagnose_cascading_failure(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(
            verdict="DEGRADE",
            event_types=["FAILOVER"],
            providers_tried=["primary", "fallback-1", "fallback-2", "fallback-3"],
        )
        assert diagnosis.category == FailureCategory.CASCADING_FAILURE
        assert diagnosis.severity == FailureSeverity.CRITICAL

    def test_diagnose_quality_degradation_parity(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(
            verdict="DEGRADE",
            event_types=["PARITY_MISMATCH"],
            degradation_level=1,
        )
        assert diagnosis.category == FailureCategory.QUALITY_DEGRADATION

    def test_diagnose_empty_response(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(
            verdict="ALLOW",
            response="",
            confidence=0.7,
        )
        assert diagnosis.category == FailureCategory.EMPTY_RESPONSE

    def test_diagnose_low_confidence(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(
            verdict="ALLOW",
            confidence=0.3,
        )
        assert diagnosis.category == FailureCategory.LOW_CONFIDENCE

    def test_diagnose_clean_allow(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(
            verdict="ALLOW",
            confidence=0.95,
            response="Cash flow analysis shows healthy runway of 14 months with strong MRR growth.",
        )
        assert diagnosis.category == FailureCategory.UNKNOWN

    def test_remediation_not_empty(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(verdict="BLOCK", pii_flags=["SSN (1)"])
        assert len(diagnosis.remediation) > 0

    def test_diagnosis_to_dict(self):
        taxonomy = FailureTaxonomy()
        diagnosis = taxonomy.diagnose(verdict="BLOCK", pii_flags=["SSN (1)"])
        d = diagnosis.to_dict()
        assert d["category"] == "pii_leak"
        assert d["severity"] == "HIGH"
        assert "signals" in d
        assert "remediation" in d

    def test_taxonomy_report(self):
        taxonomy = FailureTaxonomy()
        taxonomy.diagnose(verdict="BLOCK", pii_flags=["SSN"])
        taxonomy.diagnose(verdict="BLOCK", pii_flags=["SSN"])
        report = taxonomy.get_taxonomy_report()
        assert report["total_diagnoses"] == 2
        assert report["category_distribution"]["pii_leak"] == 2

    def test_reset(self):
        taxonomy = FailureTaxonomy()
        taxonomy.diagnose(verdict="BLOCK")
        taxonomy.reset()
        report = taxonomy.get_taxonomy_report()
        assert report["total_diagnoses"] == 0


# ---------------------------------------------------------------------------
# DataCurator
# ---------------------------------------------------------------------------


class TestDataCurator:
    def test_curate_with_data(self, tmp_path):
        collector = InferenceLogCollector()
        # Add high-quality entries
        for i in range(20):
            collector.log(
                prompt=f"Query {i}",
                response=f"Detailed analysis of query {i}. " + "Cash flow runway burn rate revenue metrics. " * 5,
                confidence=0.9 + (i % 3) * 0.03,
                verdict="ALLOW",
                degradation_level=0,
                decision_state="LOCKED" if i % 2 == 0 else "PROVISIONAL",
                agent_name="finance",
                system_prompt="You are a finance assistant.",
            )
        # Add a failure with enough response length to pass min filter
        collector.log(
            prompt="Bad query",
            response="Unable to analyze query due to provider unavailability.",
            confidence=0.1,
            verdict="BLOCK",
            degradation_level=2,
            decision_state="HALT",
        )

        taxonomy = FailureTaxonomy()
        curator = DataCurator(collector, taxonomy)
        stats = curator.curate()

        assert stats.total_log_entries == 21
        assert stats.positive_examples > 0
        assert stats.train_count > 0
        assert stats.eval_count >= 0

    def test_curate_deduplication(self, tmp_path):
        collector = InferenceLogCollector()
        # Add duplicate entries
        for _ in range(5):
            collector.log(
                prompt="Same query",
                response="Same response with enough length to qualify and be high quality.",
                confidence=0.9,
                verdict="ALLOW",
                degradation_level=0,
                decision_state="LOCKED",
                agent_name="finance",
                system_prompt="You are a finance assistant.",
            )

        taxonomy = FailureTaxonomy()
        curator = DataCurator(collector, taxonomy)
        stats = curator.curate(deduplicate=True)

        assert stats.dedup_removed == 4

    def test_export_all(self, tmp_path):
        collector = InferenceLogCollector()
        for i in range(10):
            collector.log(
                prompt=f"Query {i}",
                response=f"Detailed analysis " + "x" * 100,
                confidence=0.9,
                verdict="ALLOW",
                degradation_level=0,
                decision_state="LOCKED",
                agent_name="finance",
                system_prompt="You are a finance assistant.",
            )

        taxonomy = FailureTaxonomy()
        curator = DataCurator(collector, taxonomy)
        curator.curate()

        results = curator.export_all(tmp_path / "output")
        assert "train" in results
        assert results["train"] > 0

        # Verify curation stats file
        stats_path = tmp_path / "output" / "curation_stats.json"
        assert stats_path.exists()
        with open(stats_path) as f:
            stats_data = json.load(f)
        assert stats_data["total_log_entries"] == 10


# ---------------------------------------------------------------------------
# TrainingExample
# ---------------------------------------------------------------------------


class TestTrainingExample:
    def test_to_dict(self):
        ex = TrainingExample(
            messages=[{"role": "user", "content": "test"}],
            agent_name="finance",
            quality_score=0.9,
        )
        d = ex.to_dict()
        assert d["agent_name"] == "finance"
        assert d["quality_score"] == 0.9

    def test_to_chat_format(self):
        ex = TrainingExample(
            messages=[
                {"role": "system", "content": "You are helpful."},
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"},
            ],
        )
        chat = ex.to_chat_format()
        assert "messages" in chat
        assert len(chat["messages"]) == 3

    def test_content_hash(self):
        ex1 = TrainingExample(messages=[{"role": "user", "content": "hello"}])
        ex2 = TrainingExample(messages=[{"role": "user", "content": "hello"}])
        ex3 = TrainingExample(messages=[{"role": "user", "content": "world"}])
        assert ex1.content_hash() == ex2.content_hash()
        assert ex1.content_hash() != ex3.content_hash()


# ---------------------------------------------------------------------------
# DataCurationLayer
# ---------------------------------------------------------------------------


class TestDataCurationLayer:
    def test_evaluate_allows(self):
        layer = DataCurationLayer()
        ctx = ResilienceContext(
            prompt="What is our cash runway?",
            response="Approximately 14 months based on current burn rate.",
            confidence=0.9,
            verdict=LayerVerdict.ALLOW,
            agent_name="finance",
        )
        result = layer.evaluate(ctx)
        # Layer 6 never modifies verdict
        assert result.verdict == LayerVerdict.ALLOW
        assert result.confidence == 0.9
        assert result.response == ctx.response

    def test_evaluate_logs_entry(self):
        collector = InferenceLogCollector()
        layer = DataCurationLayer(collector=collector)
        ctx = ResilienceContext(
            prompt="test prompt",
            response="test response with enough length for quality check",
            confidence=0.85,
            verdict=LayerVerdict.ALLOW,
            agent_name="finance",
        )
        layer.evaluate(ctx)
        assert collector.entry_count == 1
        assert collector.get_entries()[0].prompt == "test prompt"

    def test_evaluate_diagnoses_failure(self):
        taxonomy = FailureTaxonomy()
        layer = DataCurationLayer(taxonomy=taxonomy)
        ctx = ResilienceContext(
            prompt="test",
            response="SSN: 123-45-6789",
            confidence=0.0,
            verdict=LayerVerdict.BLOCK,
            agent_name="finance",
            pii_flags=["SSN (1)"],
        )
        layer.evaluate(ctx)
        assert layer.diagnosis_count == 1
        assert taxonomy.get_taxonomy_report()["total_diagnoses"] == 1

    def test_evaluate_never_blocks(self):
        layer = DataCurationLayer()
        ctx = ResilienceContext(
            prompt="test",
            response="",
            confidence=0.0,
            verdict=LayerVerdict.BLOCK,
            degradation_level=2,
            decision_state=DecisionState.HALT,
        )
        result = layer.evaluate(ctx)
        # Even for BLOCK verdicts, Layer 6 preserves the original verdict
        assert result.verdict == LayerVerdict.BLOCK

    def test_get_status(self):
        layer = DataCurationLayer()
        ctx = ResilienceContext(prompt="test", response="response", confidence=0.9)
        layer.evaluate(ctx)
        status = layer.get_status()
        assert status["log_count"] == 1
        assert status["diagnosis_count"] == 1

    def test_reset(self):
        layer = DataCurationLayer()
        ctx = ResilienceContext(prompt="test", response="response", confidence=0.9)
        layer.evaluate(ctx)
        layer.reset()
        assert layer.log_count == 0
        assert layer.diagnosis_count == 0

    def test_curation_metadata(self):
        layer = DataCurationLayer()
        ctx = ResilienceContext(
            prompt="test",
            response="Good response with financial analysis of cash flow and runway metrics. " * 3,
            confidence=0.9,
            verdict=LayerVerdict.ALLOW,
            degradation_level=0,
            decision_state=DecisionState.LOCKED,
            agent_name="finance",
        )
        result = layer.evaluate(ctx)
        assert "curation" in result.metadata
        assert result.metadata["curation"]["is_high_quality"] is True

    def test_repr(self):
        layer = DataCurationLayer()
        assert "DataCurationLayer" in repr(layer)


# ---------------------------------------------------------------------------
# FinetunePipeline
# ---------------------------------------------------------------------------


class TestFinetuneConfig:
    def test_defaults(self):
        config = FinetuneConfig()
        assert config.base_model == "Qwen/Qwen2.5-7B-Instruct"
        assert config.lora_r == 16
        assert config.num_train_epochs == 3

    def test_custom_model_defaults(self):
        config = FinetuneConfig(base_model="meta-llama/Meta-Llama-3.1-8B-Instruct")
        assert config.base_model == "meta-llama/Meta-Llama-3.1-8B-Instruct"

    def test_to_dict(self):
        config = FinetuneConfig()
        d = config.to_dict()
        assert d["base_model"] == "Qwen/Qwen2.5-7B-Instruct"
        assert "lora_r" in d


class TestFinetunePipeline:
    def test_generate_axolotl_config(self, tmp_path):
        config = FinetuneConfig()
        train_path = tmp_path / "train.jsonl"
        train_path.write_text('{"messages": [{"role": "user", "content": "test"}]}')

        pipeline = FinetunePipeline(config, train_path)
        output = pipeline.generate_axolotl_config(tmp_path / "axolotl.yml")

        assert output.exists()
        content = output.read_text()
        assert "base_model" in content
        assert 'adapter: "lora"' in content or "adapter: lora" in content

    def test_generate_unsloth_script(self, tmp_path):
        config = FinetuneConfig()
        train_path = tmp_path / "train.jsonl"
        train_path.write_text('{"messages": [{"role": "user", "content": "test"}]}')

        pipeline = FinetunePipeline(config, train_path)
        output = pipeline.generate_unsloth_script(tmp_path / "finetune.py")

        assert output.exists()
        content = output.read_text()
        assert "unsloth" in content
        assert "SFTTrainer" in content

    def test_generate_dockerfile(self, tmp_path):
        config = FinetuneConfig()
        train_path = tmp_path / "train.jsonl"
        train_path.write_text("{}")

        pipeline = FinetunePipeline(config, train_path)
        output = pipeline.generate_dockerfile(tmp_path / "Dockerfile")

        assert output.exists()
        content = output.read_text()
        assert "FROM" in content
        assert "unsloth" in content.lower()

    def test_generate_run_commands(self, tmp_path):
        config = FinetuneConfig()
        train_path = tmp_path / "train.jsonl"
        train_path.write_text("{}")

        pipeline = FinetunePipeline(config, train_path)
        cmds = pipeline.generate_run_commands()
        assert "install_unsloth" in cmds
        assert "run_axolotl" in cmds
        assert "run_tests" in cmds

    def test_pipeline_info(self, tmp_path):
        config = FinetuneConfig()
        train_path = tmp_path / "train.jsonl"
        train_path.write_text("{}")
        eval_path = tmp_path / "eval.jsonl"
        eval_path.write_text("{}")

        pipeline = FinetunePipeline(config, train_path, eval_path=eval_path)
        info = pipeline.get_pipeline_info()
        assert info["base_model"] == "Qwen/Qwen2.5-7B-Instruct"
        assert info["eval_path"] is not None


# ---------------------------------------------------------------------------
# Integration: Full Stack with Layer 6
# ---------------------------------------------------------------------------


class TestFullStackWithLayer6:
    def test_stack_includes_layer_6(self):
        client = _make_client()
        stack = ResilienceStack(client, enable_data_curation=True)
        status = stack.get_status()
        assert len(status["layers"]) == 6
        assert 6 in status["layers"]

    def test_stack_without_layer_6(self):
        client = _make_client()
        stack = ResilienceStack(client, enable_data_curation=False)
        status = stack.get_status()
        assert len(status["layers"]) == 5

    def test_data_curation_accessible(self):
        client = _make_client()
        stack = ResilienceStack(client, enable_data_curation=True)
        assert stack.data_curation is not None

    def test_execute_logs_to_collector(self):
        client = _make_client()
        stack = ResilienceStack(client, enable_data_curation=True)
        ctx = stack.execute_with_resilience(
            prompt="What is our cash runway?",
            agents=["finance"],
            system_prompt="You are a finance assistant.",
        )
        assert ctx.response != ""

        # Verify Layer 6 collected data
        layer6 = stack.data_curation
        assert layer6.log_count == 1
        assert layer6.diagnosis_count == 1

    def test_curation_collector_stats(self):
        client = _make_client()
        stack = ResilienceStack(client, enable_data_curation=True)
        stack.execute_with_resilience(
            prompt="Analyze our Q3 cash position.",
            agents=["finance"],
            system_prompt="You are a finance assistant.",
        )
        status = stack.data_curation.get_status()
        assert status["log_count"] == 1
        collector_stats = status["collector_stats"]
        assert collector_stats["total_entries"] == 1
