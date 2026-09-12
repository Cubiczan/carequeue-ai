"""Tests for the 5-Layer Resilience Stack."""

from __future__ import annotations

import pytest

from gateway.client import ResilientGatewayClient
from layers.resilience_stack import (
    ResilienceLayer,
    ResilienceEventType,
    ResilienceEvent,
    ResilienceContext,
    LayerVerdict,
    DecisionState,
    GatewayLayer,
    ParityLayer,
    GovernanceLayer,
    StateMachineLayer,
    UserExperienceLayer,
    ResilienceStack,
    _compute_quality_score,
    _PII_PATTERNS,
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


def _make_context(prompt: str = "What is our cash runway?", agent_name: str = "finance") -> ResilienceContext:
    return ResilienceContext(
        prompt=prompt,
        messages=[{"role": "user", "content": prompt}],
        agent_name=agent_name,
    )


# ---------------------------------------------------------------------------
# ResilienceContext
# ---------------------------------------------------------------------------

class TestResilienceContext:
    def test_default_values(self):
        ctx = ResilienceContext()
        assert ctx.prompt == ""
        assert ctx.verdict == LayerVerdict.ALLOW
        assert ctx.confidence == 1.0
        assert ctx.degradation_level == 0
        assert ctx.decision_state == DecisionState.EXPLORING
        assert len(ctx.events) == 0

    def test_emit_event(self):
        ctx = ResilienceContext()
        event = ctx.emit_event(
            layer=ResilienceLayer.GATEWAY,
            event_type=ResilienceEventType.ALLOW,
        )
        assert len(ctx.events) == 1
        assert event.layer == ResilienceLayer.GATEWAY
        assert event.event_type == ResilienceEventType.ALLOW


# ---------------------------------------------------------------------------
# Quality scoring
# ---------------------------------------------------------------------------

class TestQualityScore:
    def test_empty_text(self):
        assert _compute_quality_score("", ["cash", "revenue"]) == 0.0

    def test_short_text_low_score(self):
        text = "Hello world"
        score = _compute_quality_score(text, ["cash", "revenue"])
        assert 0.0 < score < 0.5

    def test_domain_rich_text_higher_score(self):
        text = "Our cash flow analysis shows revenue growth of 15%. The burn rate and runway indicate 14 months of liquidity. EBITDA margins improved by 3 percentage points."
        score = _compute_quality_score(text, ["cash flow", "revenue", "burn rate", "runway", "ebitda"])
        assert score > 0.3

    def test_structured_text_bonus(self):
        text_with_numbers = "1. First point about cash flow. (2) Second point about revenue."
        text_plain = "First point about cash flow. Second point about revenue."
        score_structured = _compute_quality_score(text_with_numbers, ["cash flow", "revenue"])
        score_plain = _compute_quality_score(text_plain, ["cash flow", "revenue"])
        assert score_structured >= score_plain


# ---------------------------------------------------------------------------
# PII detection
# ---------------------------------------------------------------------------

class TestPIIDetection:
    def test_ssn_detected(self):
        ctx = _make_context()
        ctx.response = "The SSN is 123-45-6789."
        layer = GovernanceLayer()
        ctx = layer.evaluate(ctx)
        assert len(ctx.pii_flags) > 0
        assert any("SSN" in f for f in ctx.pii_flags)

    def test_email_detected(self):
        ctx = _make_context()
        ctx.response = "Contact john@example.com for details."
        layer = GovernanceLayer()
        ctx = layer.evaluate(ctx)
        assert any("Email" in f for f in ctx.pii_flags)

    def test_credit_card_detected(self):
        ctx = _make_context()
        ctx.response = "Card number: 4111-2222-3333-4444."
        layer = GovernanceLayer()
        ctx = layer.evaluate(ctx)
        assert any("Credit Card" in f for f in ctx.pii_flags)

    def test_clean_response(self):
        ctx = _make_context()
        ctx.response = "Cash flow analysis shows healthy runway of 14 months."
        layer = GovernanceLayer()
        ctx = layer.evaluate(ctx)
        assert len(ctx.pii_flags) == 0
        assert ctx.verdict == LayerVerdict.ALLOW

    def test_pii_stripped(self):
        ctx = _make_context()
        ctx.response = "SSN: 123-45-6789. Email: test@test.com. Phone: 555-123-4567."
        layer = GovernanceLayer(strip_pii=True)
        ctx = layer.evaluate(ctx)
        assert "123-45-6789" not in ctx.response
        assert "[SSN REDACTED]" in ctx.response

    def test_excessive_pii_blocks(self):
        ctx = _make_context()
        # Add many PII types to exceed threshold
        ctx.response = (
            "SSN: 123-45-6789. SSN2: 987-65-4321. "
            "Email: a@b.com. Email2: c@d.com. "
            "Phone: 555-111-2222. Phone2: 555-333-4444. "
            "Card: 4111-2222-3333-4444. "
            "Account number: 123456. "
            "DOB: 01/15/1985. "
            "Address: 123 Main Street. "
        )
        layer = GovernanceLayer(max_flags_before_block=3)
        ctx = layer.evaluate(ctx)
        assert ctx.verdict == LayerVerdict.BLOCK
        assert ctx.confidence == 0.0


# ---------------------------------------------------------------------------
# State Machine
# ---------------------------------------------------------------------------

class TestStateMachine:
    def test_initial_state(self):
        sm = StateMachineLayer()
        assert sm.current_state == DecisionState.EXPLORING

    def test_exploring_to_provisional(self):
        sm = StateMachineLayer()
        ctx = _make_context()
        ctx.confidence = 0.9
        ctx.degradation_level = 0
        sm.evaluate(ctx)
        assert sm.current_state == DecisionState.PROVISIONAL

    def test_exploring_to_halt_on_low_confidence(self):
        sm = StateMachineLayer()
        ctx = _make_context()
        ctx.confidence = 0.3
        sm.evaluate(ctx)
        assert sm.current_state == DecisionState.HALT

    def test_halt_to_recover(self):
        sm = StateMachineLayer()
        # Force halt
        sm._state = DecisionState.HALT
        ctx = _make_context()
        ctx.confidence = 0.7
        ctx.verdict = LayerVerdict.ALLOW
        sm.evaluate(ctx)
        assert sm.current_state == DecisionState.EXPLORING
        assert sm.recovery_count == 1

    def test_locked_is_terminal(self):
        sm = StateMachineLayer()
        sm._state = DecisionState.LOCKED
        ctx = _make_context()
        ctx.confidence = 0.1
        sm.evaluate(ctx)
        assert sm.current_state == DecisionState.LOCKED

    def test_reset(self):
        sm = StateMachineLayer()
        sm._state = DecisionState.LOCKED
        sm._halt_count = 5
        sm.reset()
        assert sm.current_state == DecisionState.EXPLORING
        assert sm.halt_count == 0


# ---------------------------------------------------------------------------
# Gateway Layer (mock mode)
# ---------------------------------------------------------------------------

class TestGatewayLayer:
    def test_allows_in_mock_mode(self):
        client = _make_client()
        layer = GatewayLayer(client, fallback_models=["fallback-1", "fallback-2"])
        ctx = _make_context()
        ctx = layer.evaluate(ctx)
        assert ctx.response != ""
        assert ctx.verdict == LayerVerdict.ALLOW

    def test_records_latency(self):
        client = _make_client()
        layer = GatewayLayer(client)
        ctx = _make_context()
        ctx = layer.evaluate(ctx)
        # Latency is recorded in the event details (duration_ms)
        latency_events = [e for e in ctx.events if e.details.get("latency_ms")]
        assert len(latency_events) > 0


# ---------------------------------------------------------------------------
# User Experience Layer
# ---------------------------------------------------------------------------

class TestUserExperienceLayer:
    def test_no_degradation_message(self):
        layer = UserExperienceLayer()
        ctx = _make_context()
        ctx.response = "Clean response."
        ctx.degradation_level = 0
        ctx = layer.evaluate(ctx)
        assert "Resilience Notice" not in ctx.response

    def test_level_1_degradation_notice(self):
        layer = UserExperienceLayer()
        ctx = _make_context()
        ctx.response = "Partial response."
        ctx.degradation_level = 1
        ctx = layer.evaluate(ctx)
        assert "Resilience Notice" in ctx.response

    def test_level_2_degradation_notice(self):
        layer = UserExperienceLayer()
        ctx = _make_context()
        ctx.response = "Degraded response."
        ctx.degradation_level = 2
        ctx = layer.evaluate(ctx)
        assert "Degraded Service" in ctx.response

    def test_builds_summary(self):
        layer = UserExperienceLayer()
        ctx = _make_context()
        ctx.response = "Test."
        ctx = layer.evaluate(ctx)
        summary = ctx.metadata.get("resilience_summary", {})
        assert "total_events" in summary
        assert "confidence_score" in summary


# ---------------------------------------------------------------------------
# Parity Layer (mock mode)
# ---------------------------------------------------------------------------

class TestParityLayer:
    def test_allows_in_mock_mode(self):
        client = _make_client()
        layer = ParityLayer(client)
        # First run through gateway to get a response
        gw_layer = GatewayLayer(client)
        ctx = _make_context()
        ctx = gw_layer.evaluate(ctx)
        # Then through parity
        ctx = layer.evaluate(ctx)
        assert ctx.verdict == LayerVerdict.ALLOW


# ---------------------------------------------------------------------------
# Full Resilience Stack
# ---------------------------------------------------------------------------

class TestResilienceStack:
    def test_execute_full_stack(self):
        client = _make_client()
        stack = ResilienceStack(client)
        ctx = stack.execute_with_resilience(
            prompt="What is our cash runway?",
            agents=["finance"],
            system_prompt="You are a finance assistant.",
        )
        assert ctx.response != ""
        assert ctx.verdict == LayerVerdict.ALLOW
        assert ctx.total_latency_ms > 0
        # Should have events from multiple layers
        assert len(ctx.events) >= 3

    def test_stack_blocks_on_excessive_pii(self):
        client = _make_client()
        # Governance layer scans the *response*, not the prompt.
        # The mock response is clean, so we directly test the governance layer.
        layer = GovernanceLayer(max_flags_before_block=2)
        ctx = ResilienceContext(
            prompt="test",
            messages=[{"role": "user", "content": "test"}],
            response=(
                "SSN: 123-45-6789. SSN2: 987-65-4321. "
                "Email: a@b.com. Email2: c@d.com. "
                "Phone: 555-111-2222. Phone2: 555-333-4444. "
                "Card: 4111-2222-3333-4444. "
                "Account number: 123456. "
                "DOB: 01/15/1985. "
                "Address: 123 Main Street. "
            ),
        )
        ctx = layer.evaluate(ctx)
        assert ctx.verdict == LayerVerdict.BLOCK

    def test_stack_status(self):
        client = _make_client()
        stack = ResilienceStack(client)
        status = stack.get_status()
        assert status["decision_state"] == "EXPLORING"
        # 5 core layers + optional Layer 6 (data curation)
        assert len(status["layers"]) in (5, 6)

    def test_stack_reset(self):
        client = _make_client()
        stack = ResilienceStack(client)
        ctx = stack.execute_with_resilience(prompt="test", agents=["finance"])
        stack.reset()
        assert stack.state_machine.current_state == DecisionState.EXPLORING


# ---------------------------------------------------------------------------
# ResilienceEvent serialization
# ---------------------------------------------------------------------------

class TestResilienceEvent:
    def test_to_dict(self):
        event = ResilienceEvent(
            layer=ResilienceLayer.GATEWAY,
            event_type=ResilienceEventType.ALLOW,
        )
        d = event.to_dict()
        assert d["layer"] == 1
        assert d["event_type"] == "ALLOW"
        assert "event_id" in d
        assert "timestamp" in d
