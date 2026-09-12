"""
agents.cfo_agents — CFO-Specialised AI Agents with Resilience
==============================================================

Three domain-specific CFO agents, each with its own system prompt and
resilience context, that delegate every LLM call to the
:class:`ResilienceStack`.

Agents
------
* :class:`FinanceAgent` — Cash flow, runway, and quantitative financial
  analysis.
* :class:`StrategyAgent` — Market positioning, competitive moat, and
  strategic alignment.
* :class:`ComplianceAgent` — Regulatory risk, audit posture, and
  governance compliance.

All agents inherit from :class:`CFOAgent` which handles the common
boilerplate of prompt construction, resilience-stack invocation, and
structured result formatting.
"""

from __future__ import annotations

import logging
import time
from abc import ABC
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from gateway.client import ResilientGatewayClient
from layers.resilience_stack import ResilienceStack

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logger = logging.getLogger("cfo_resilience.agents")

# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------


@dataclass
class AgentResult:
    """Structured output returned by every CFO agent.

    Attributes
    ----------
    agent_name : str
        Name of the agent that produced the result.
    response : str
        The LLM-generated analysis text.
    confidence : float
        Confidence score after resilience evaluation (0.0–1.0).
    verdict : str
        Final verdict from the resilience stack (ALLOW / BLOCK / DEGRADE).
    resilience_events : list[dict[str, Any]]
        Chronological list of all resilience events that occurred.
    degradation_level : int
        0 = full quality, 1 = reduced confidence, 2 = significant degradation.
    decision_state : str
        CHP decision state after evaluation.
    metadata : dict[str, Any]
        Additional metadata (token usage, latency, etc.).
    latency_ms : float
        Total wall-clock time for the agent call, in milliseconds.
    """

    agent_name: str
    response: str
    confidence: float
    verdict: str
    resilience_events: list[dict[str, Any]] = field(default_factory=list)
    degradation_level: int = 0
    decision_state: str = "EXPLORING"
    metadata: dict[str, Any] = field(default_factory=dict)
    latency_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent_name": self.agent_name,
            "response": self.response,
            "confidence": round(self.confidence, 3),
            "verdict": self.verdict,
            "degradation_level": self.degradation_level,
            "decision_state": self.decision_state,
            "resilience_events": self.resilience_events,
            "metadata": self.metadata,
            "latency_ms": round(self.latency_ms, 2),
        }

    def resilience_summary(self) -> str:
        """Human-readable summary of resilience actions taken."""
        event_counts: dict[str, int] = {}
        for event in self.resilience_events:
            etype = event.get("event_type", "UNKNOWN")
            event_counts[etype] = event_counts.get(etype, 0) + 1

        parts = [f"Agent: {self.agent_name}"]
        parts.append(f"Confidence: {self.confidence:.1%}")
        parts.append(f"Verdict: {self.verdict}")
        parts.append(f"Decision State: {self.decision_state}")
        parts.append(f"Degradation Level: {self.degradation_level}/2")
        parts.append(f"Latency: {self.latency_ms:.0f}ms")

        if event_counts:
            event_str = ", ".join(f"{k}={v}" for k, v in event_counts.items())
            parts.append(f"Resilience Events: {event_str}")

        return "\n".join(parts)


# ---------------------------------------------------------------------------
# Base Agent
# ---------------------------------------------------------------------------


class CFOAgent(ABC):
    """Base class for CFO-specialised AI agents.

    Every agent sets its own system prompt and agent name, then delegates
    LLM calls to the :class:`ResilienceStack`.  The ``analyze`` method
    returns a structured :class:`AgentResult`.

    Parameters
    ----------
    name : str
        Human-readable agent name.
    gateway_client : ResilientGatewayClient
        Gateway client used by the resilience stack.
    resilience_stack : ResilienceStack
        Pre-configured resilience stack.
    """

    # Subclasses override these
    name: str = "cfo-base"
    system_prompt: str = (
        "You are a CFO AI assistant. Provide clear, structured, and "
        "actionable analysis. Use numbered lists and specific metrics "
        "where possible."
    )

    def __init__(
        self,
        gateway_client: ResilientGatewayClient,
        resilience_stack: ResilienceStack,
    ) -> None:
        self._client = gateway_client
        self._stack = resilience_stack
        self._call_count: int = 0

    def analyze(
        self,
        prompt: str,
        context: dict[str, Any] | None = None,
    ) -> AgentResult:
        """Run an analysis prompt through the resilience stack.

        Parameters
        ----------
        prompt : str
            The user's query / analysis request.
        context : dict[str, Any] | None
            Additional context merged into the resilience context.

        Returns
        -------
        AgentResult
            Structured result with response, confidence, and resilience
            event log.
        """
        start = time.monotonic()
        self._call_count += 1

        logger.info(
            "Agent %s analyzing prompt (call #%d, length=%d)",
            self.name,
            self._call_count,
            len(prompt),
        )

        # Build context with EGIS (agent identity) metadata
        full_context: dict[str, Any] = {
            "agent_name": self.name,
            "call_number": self._call_count,
            "egis_context": {
                "agent_type": "cfo_advisor",
                "agent_name": self.name,
                "clearance_level": "financial_analysis",
            },
        }
        if context:
            full_context.update(context)

        # Execute through the resilience stack
        res_ctx = self._stack.execute_with_resilience(
            prompt=prompt,
            agents=[self.name],
            system_prompt=self.system_prompt,
            context_data=full_context,
        )

        elapsed_ms = (time.monotonic() - start) * 1000

        # Build result
        result = AgentResult(
            agent_name=self.name,
            response=res_ctx.response,
            confidence=res_ctx.confidence,
            verdict=res_ctx.verdict.value,
            degradation_level=res_ctx.degradation_level,
            decision_state=res_ctx.decision_state.value if hasattr(res_ctx.decision_state, "value") else str(res_ctx.decision_state),
            resilience_events=[e.to_dict() for e in res_ctx.events],
            metadata=res_ctx.metadata,
            latency_ms=elapsed_ms,
        )

        logger.info(
            "Agent %s complete: verdict=%s, confidence=%.3f, latency=%.1fms",
            self.name,
            result.verdict,
            result.confidence,
            elapsed_ms,
        )

        return result

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name!r}, calls={self._call_count})"


# ---------------------------------------------------------------------------
# Finance Agent
# ---------------------------------------------------------------------------


class FinanceAgent(CFOAgent):
    """Analyses financial impact, cash flow, runway, and quantitative metrics.

    System prompt focuses on financial statements, KPIs, and actionable
    fiscal recommendations.
    """

    name = "finance"
    system_prompt = (
        "You are a senior Financial Analyst AI assistant to the CFO. "
        "Your analysis focuses on:\n"
        "1. **Cash Flow Analysis** — Operating, investing, and financing cash flows.\n"
        "2. **Runway & Burn Rate** — Months of runway, burn rate trends, and scenarios.\n"
        "3. **Revenue Metrics** — ARR/MRR growth, net retention, customer concentration.\n"
        "4. **Cost Structure** — COGS trends, OpEx breakdown, unit economics.\n"
        "5. **Liquidity & Capital** — Debt covenants, credit facilities, equity position.\n"
        "\n"
        "Always provide:\n"
        "- Specific numbers and percentages (use realistic estimates if data is missing).\n"
        "- Risk-rated recommendations (HIGH/MEDIUM/LOW confidence).\n"
        "- 90-day action items with expected financial impact.\n"
        "- Sensitivity analysis for key assumptions.\n"
        "\n"
        "Format your response with clear headers and numbered action items. "
        "Do NOT include real PII such as SSNs, account numbers, or personal addresses."
    )


# ---------------------------------------------------------------------------
# Strategy Agent
# ---------------------------------------------------------------------------


class StrategyAgent(CFOAgent):
    """Evaluates strategic alignment, competitive positioning, and growth.

    System prompt focuses on market analysis, strategic fit, and
    competitive moat assessment.
    """

    name = "strategy"
    system_prompt = (
        "You are a Chief Strategy Officer AI assistant advising the CFO. "
        "Your analysis focuses on:\n"
        "1. **Market Positioning** — Current market share, competitive ranking, category.\n"
        "2. **Competitive Moat** — Technology advantage, switching costs, network effects, brand.\n"
        "3. **Growth Opportunities** — Adjacent markets, M&A targets, geographic expansion.\n"
        "4. **Threat Assessment** — Disruption risk, new entrants, commoditization pressure.\n"
        "5. **Strategic Alignment** — How current initiatives map to long-term vision.\n"
        "\n"
        "Always provide:\n"
        "- A strategic score (1-10) for each dimension with justification.\n"
        "- Competitive comparison matrix when applicable.\n"
        "- Scenario analysis (base/bull/bear) for strategic decisions.\n"
        "- 12-month strategic roadmap with milestones.\n"
        "\n"
        "Format your response with clear headers, comparative tables where useful, "
        "and numbered strategic actions. "
        "Do NOT include real PII such as SSNs, account numbers, or personal addresses."
    )


# ---------------------------------------------------------------------------
# Compliance Agent
# ---------------------------------------------------------------------------


class ComplianceAgent(CFOAgent):
    """Assesses regulatory risk, compliance posture, and governance.

    System prompt focuses on risk assessment, regulatory requirements,
    and compliance framework evaluation.
    """

    name = "compliance"
    system_prompt = (
        "You are a Chief Compliance Officer AI assistant advising the CFO. "
        "Your analysis focuses on:\n"
        "1. **Regulatory Landscape** — Current and upcoming regulations affecting the business.\n"
        "2. **Compliance Posture** — Current certifications, audit status, control effectiveness.\n"
        "3. **Risk Assessment** — Regulatory risk score, potential penalties, exposure quantification.\n"
        "4. **Data Privacy** — GDPR/CCPA compliance, data handling practices, consent management.\n"
        "5. **Governance Framework** — Board oversight, policy coverage, escalation procedures.\n"
        "\n"
        "Always provide:\n"
        "- Risk scores on a 1-10 scale for each regulatory dimension.\n"
        "- Compliance gap analysis with remediation priorities.\n"
        "- Regulatory calendar with upcoming deadlines and requirements.\n"
        "- Quantified financial risk exposure (estimated penalty ranges).\n"
        "\n"
        "Format your response with clear headers, risk matrices, and numbered "
        "action items with compliance deadlines. "
        "Do NOT include real PII such as SSNs, account numbers, or personal addresses."
    )


# ---------------------------------------------------------------------------
# Convenience factory
# ---------------------------------------------------------------------------


def create_agents(
    gateway_client: ResilientGatewayClient,
    fallback_models: list[str] | None = None,
) -> tuple[FinanceAgent, StrategyAgent, ComplianceAgent, ResilienceStack]:
    """Create all three CFO agents with a shared resilience stack.

    Returns
    -------
    tuple[FinanceAgent, StrategyAgent, ComplianceAgent, ResilienceStack]
        The three agents and the shared stack for external inspection.
    """
    stack = ResilienceStack(
        gateway_client=gateway_client,
        fallback_models=fallback_models,
    )
    finance = FinanceAgent(gateway_client=gateway_client, resilience_stack=stack)
    strategy = StrategyAgent(gateway_client=gateway_client, resilience_stack=stack)
    compliance = ComplianceAgent(gateway_client=gateway_client, resilience_stack=stack)
    return finance, strategy, compliance, stack
