"""Tests for the CFO Agents."""

from __future__ import annotations

import pytest

from gateway.client import ResilientGatewayClient
from layers.resilience_stack import ResilienceStack
from agents.cfo_agents import (
    FinanceAgent,
    StrategyAgent,
    ComplianceAgent,
    AgentResult,
    create_agents,
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


# ---------------------------------------------------------------------------
# AgentResult
# ---------------------------------------------------------------------------

class TestAgentResult:
    def test_to_dict(self):
        result = AgentResult(
            agent_name="finance",
            response="Test response.",
            confidence=0.95,
            verdict="ALLOW",
            latency_ms=42.5,
        )
        d = result.to_dict()
        assert d["agent_name"] == "finance"
        assert d["confidence"] == 0.95
        assert d["verdict"] == "ALLOW"
        assert d["latency_ms"] == 42.5
        assert "resilience_events" in d

    def test_resilience_summary(self):
        result = AgentResult(
            agent_name="finance",
            response="Test.",
            confidence=0.85,
            verdict="ALLOW",
            decision_state="PROVISIONAL",
            resilience_events=[
                {"event_type": "ALLOW"},
                {"event_type": "RETRY"},
                {"event_type": "ALLOW"},
            ],
        )
        summary = result.resilience_summary()
        assert "finance" in summary
        assert "85.0%" in summary
        assert "RETRY=1" in summary
        assert "PROVISIONAL" in summary


# ---------------------------------------------------------------------------
# Individual Agents
# ---------------------------------------------------------------------------

class TestFinanceAgent:
    def test_analyze_returns_result(self):
        client = _make_client()
        stack = ResilienceStack(client)
        agent = FinanceAgent(client, stack)
        result = agent.analyze("What is our cash runway?")
        assert isinstance(result, AgentResult)
        assert result.agent_name == "finance"
        assert result.response != ""
        assert result.confidence > 0
        assert result.latency_ms > 0

    def test_has_finance_system_prompt(self):
        assert "cash" in FinanceAgent.system_prompt.lower()
        assert "runway" in FinanceAgent.system_prompt.lower()
        assert "burn rate" in FinanceAgent.system_prompt.lower()


class TestStrategyAgent:
    def test_analyze_returns_result(self):
        client = _make_client()
        stack = ResilienceStack(client)
        agent = StrategyAgent(client, stack)
        result = agent.analyze("Evaluate our competitive moat.")
        assert isinstance(result, AgentResult)
        assert result.agent_name == "strategy"
        assert result.response != ""

    def test_has_strategy_system_prompt(self):
        assert "market" in StrategyAgent.system_prompt.lower()
        assert "competitive" in StrategyAgent.system_prompt.lower()


class TestComplianceAgent:
    def test_analyze_returns_result(self):
        client = _make_client()
        stack = ResilienceStack(client)
        agent = ComplianceAgent(client, stack)
        result = agent.analyze("Assess our compliance posture.")
        assert isinstance(result, AgentResult)
        assert result.agent_name == "compliance"
        assert result.response != ""

    def test_has_compliance_system_prompt(self):
        assert "regulatory" in ComplianceAgent.system_prompt.lower()
        assert "risk" in ComplianceAgent.system_prompt.lower()
        assert "gdpr" in ComplianceAgent.system_prompt.lower()


# ---------------------------------------------------------------------------
# Factory function
# ---------------------------------------------------------------------------

class TestCreateAgents:
    def test_creates_all_agents(self):
        client = _make_client()
        finance, strategy, compliance, stack = create_agents(client)
        assert isinstance(finance, FinanceAgent)
        assert isinstance(strategy, StrategyAgent)
        assert isinstance(compliance, ComplianceAgent)
        assert isinstance(stack, ResilienceStack)

    def test_agents_share_stack(self):
        client = _make_client()
        finance, strategy, compliance, stack = create_agents(client)
        assert finance._stack is stack
        assert strategy._stack is stack
        assert compliance._stack is stack


# ---------------------------------------------------------------------------
# Agent repr
# ---------------------------------------------------------------------------

class TestAgentRepr:
    def test_repr(self):
        client = _make_client()
        stack = ResilienceStack(client)
        agent = FinanceAgent(client, stack)
        r = repr(agent)
        assert "FinanceAgent" in r
        assert "calls=0" in r

    def test_repr_after_call(self):
        client = _make_client()
        stack = ResilienceStack(client)
        agent = FinanceAgent(client, stack)
        agent.analyze("test")
        r = repr(agent)
        assert "calls=1" in r
