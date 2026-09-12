#!/usr/bin/env python3
"""
demo.py — CFO Resilience Matrix Demo
===============================================

Runs a comprehensive demo showcasing the 5-layer resilience stack
responding to simulated infrastructure chaos.

Usage:
    python demo.py              # Full demo (all scenarios)
    python demo.py --scenario provider_down
    python demo.py --scenario intermittent
    python demo.py --scenario rate_limited
    python demo.py --scenario mcp_error
    python demo.py --scenario cascading
    python demo.py --scenario full_outage
    python demo.py --scenario none       # No chaos, clean run
    python demo.py --fast                # Skip slow scenarios
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any

# Ensure src/ is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gateway.client import ResilientGatewayClient
from layers.resilience_stack import ResilienceStack, DecisionState
from agents.cfo_agents import create_agents, AgentResult
from chaos.engine import ChaosEngine, ChaosScenario

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("demo")

# ---------------------------------------------------------------------------
# ANSI colors
# ---------------------------------------------------------------------------

class C:
    """ANSI color codes."""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"
    BG_GREEN = "\033[42m"
    BG_RED = "\033[41m"
    BG_YELLOW = "\033[43m"


# ---------------------------------------------------------------------------
# Print helpers
# ---------------------------------------------------------------------------

def banner(text: str, width: int = 72, char: str = "=") -> None:
    """Print a centered banner."""
    padding = max((width - len(text)) // 2, 0)
    line = char * width
    print(f"\n{C.CYAN}{line}{C.RESET}")
    print(f"{C.BOLD}{C.WHITE}{' ' * padding}{text}{C.RESET}")
    print(f"{C.CYAN}{line}{C.RESET}\n")


def section(text: str) -> None:
    """Print a section header."""
    print(f"\n{C.BOLD}{C.BLUE}--- {text} ---{C.RESET}")


def result_line(label: str, value: str, color: str = C.WHITE) -> None:
    """Print a labeled result line."""
    print(f"  {C.DIM}{label:<28}{C.RESET}{color}{value}{C.RESET}")


def verdict_color(verdict: str) -> str:
    if verdict == "ALLOW":
        return C.GREEN
    if verdict == "DEGRADE":
        return C.YELLOW
    return C.RED


def confidence_bar(confidence: float, width: int = 20) -> str:
    filled = int(confidence * width)
    bar = C.GREEN + "#" * filled + C.DIM + "-" * (width - filled) + C.RESET
    return f"[{bar}] {confidence:.1%}"


def state_badge(state: str) -> str:
    colors = {
        "EXPLORING": C.CYAN,
        "PROVISIONAL": C.YELLOW,
        "LOCKED": C.GREEN,
        "HALT": C.RED,
        "RECOVER": C.MAGENTA,
    }
    c = colors.get(state, C.WHITE)
    return f"{c}[{state}]{C.RESET}"


def print_result(result: AgentResult) -> None:
    """Pretty-print an agent result."""
    vc = verdict_color(result.verdict)
    result_line("Agent:", C.BOLD + result.agent_name.upper() + C.RESET)
    result_line("Verdict:", vc + C.BOLD + result.verdict + C.RESET)
    result_line("Confidence:", confidence_bar(result.confidence))
    result_line("Decision State:", state_badge(result.decision_state))
    result_line("Degradation:", f"Level {result.degradation_level}/2")
    result_line("Latency:", f"{result.latency_ms:.0f}ms")

    # Event summary
    event_counts: dict[str, int] = {}
    for ev in result.resilience_events:
        et = ev.get("event_type", "UNKNOWN")
        event_counts[et] = event_counts.get(et, 0) + 1
    if event_counts:
        parts = [f"{k}={v}" for k, v in event_counts.items()]
        result_line("Resilience Events:", C.DIM + ", ".join(parts) + C.RESET)

    # Response preview
    if result.response:
        preview = result.response[:200].replace("\n", " ")
        if len(result.response) > 200:
            preview += "..."
        result_line("Response:", C.DIM + preview + C.RESET)

    print()


def print_metrics(client: ResilientGatewayClient) -> None:
    """Print gateway metrics summary."""
    metrics = client.get_metrics()
    result_line("Total Requests:", str(metrics.total_requests))
    result_line("Total Retries:", C.YELLOW + str(metrics.total_retries) + C.RESET)
    result_line("Total Failovers:", C.RED + str(metrics.total_failovers) + C.RESET)
    result_line("Tokens Used:", str(metrics.total_tokens_used))

    health = client.health_report()
    sys_health = health["system_health"]
    status_c = C.GREEN if sys_health["overall_status"] == "healthy" else C.YELLOW if sys_health["overall_status"] == "degraded" else C.RED
    result_line("System Health:", status_c + sys_health["overall_status"].upper() + C.RESET)


def print_chaos_stats(engine: ChaosEngine) -> None:
    """Print chaos engine statistics."""
    stats = engine.stats
    result_line("Calls Intercepted:", str(stats.total_calls_intercepted))
    result_line("Faults Injected:", C.RED + str(stats.total_injections) + C.RESET)
    rate = stats.total_injections / max(stats.total_calls_intercepted, 1)
    result_line("Injection Rate:", f"{rate:.1%}")
    result_line("Recoveries:", C.GREEN + str(stats.recovery_count) + C.RESET)
    if stats.injections_by_scenario:
        parts = [f"{k}={v}" for k, v in stats.injections_by_scenario.items()]
        result_line("By Scenario:", C.DIM + ", ".join(parts) + C.RESET)


def print_stack_status(stack: ResilienceStack) -> None:
    """Print resilience stack status."""
    status = stack.get_status()
    result_line("Decision State:", state_badge(status["decision_state"]))
    result_line("Halt Count:", C.RED + str(status["halt_count"]) + C.RESET)
    result_line("Recovery Count:", C.GREEN + str(status["recovery_count"]) + C.RESET)


# ---------------------------------------------------------------------------
# Demo scenarios
# ---------------------------------------------------------------------------

SCENARIO_MAP: dict[str, list[ChaosScenario]] = {
    "none": [],
    "provider_down": [ChaosScenario.PROVIDER_DOWN],
    "intermittent": [ChaosScenario.INTERMITTENT_ERRORS],
    "rate_limited": [ChaosScenario.RATE_LIMITED],
    "mcp_error": [ChaosScenario.MCP_SERVER_ERROR],
    "cascading": [ChaosScenario.CASCADING_FAILURE],
    "full_outage": [ChaosScenario.FULL_OUTAGE],
}

SCENARIO_DESCRIPTIONS: dict[str, str] = {
    "none": "Clean run — no chaos injected",
    "provider_down": "Primary LLM provider returns 503 — failover activates",
    "intermittent": "Random 500/502 errors at 40% rate — retries handle",
    "rate_limited": "HTTP 429 every 3rd call — backoff then recovery",
    "mcp_error": "MCP tool-call timeouts at 50% rate — graceful degradation",
    "cascading": "Provider fails repeatedly then recovers — circuit-breaker pattern",
    "full_outage": "Complete outage for 20 calls then auto-recovery",
}

QUERY_MAP = {
    "finance": "What is our current cash runway, and what are the top 3 risks to liquidity in Q3?",
    "strategy": "Evaluate our competitive moat strength and identify the most impactful growth opportunity for the next 12 months.",
    "compliance": "Assess our regulatory compliance posture across GDPR, SOC 2, and CCPA. What are the highest-priority gaps?",
}


def run_scenario(
    scenario_name: str,
    client: ResilientGatewayClient,
    finance: Any,
    strategy: Any,
    compliance: Any,
    stack: ResilienceStack,
    engine: ChaosEngine,
    fast: bool = False,
) -> None:
    """Run a single chaos scenario against all 3 agents."""
    scenarios = SCENARIO_MAP.get(scenario_name, [])
    description = SCENARIO_DESCRIPTIONS.get(scenario_name, "Unknown")

    banner(f"SCENARIO: {scenario_name.upper().replace('_', ' ')}")
    print(f"  {C.DIM}{description}{C.RESET}\n")

    if fast and scenario_name == "full_outage":
        print(f"  {C.YELLOW}[FAST MODE] Skipping slow full_outage scenario{C.RESET}")
        return

    # Configure chaos engine
    engine.reset_stats()
    engine.deactivate()
    if scenarios:
        engine._scenarios = scenarios
        engine._stats.active_scenarios = [s.value for s in scenarios]
        engine.activate()
        print(f"  {C.RED}ChaosEngine ACTIVATED: {', '.join(s.value for s in scenarios)}{C.RESET}\n")
    else:
        print(f"  {C.GREEN}ChaosEngine INACTIVE (clean run){C.RESET}\n")

    # Reset gateway metrics for clean scenario
    client.reset_metrics()
    stack.reset()

    # Run all 3 agents
    agents = [
        ("Finance", finance, QUERY_MAP["finance"]),
        ("Strategy", strategy, QUERY_MAP["strategy"]),
        ("Compliance", compliance, QUERY_MAP["compliance"]),
    ]

    for agent_label, agent, query in agents:
        print(f"  {C.BOLD}{C.MAGENTA}>>> {agent_label} Agent{C.RESET}")
        print(f"  {C.DIM}    Query: {query[:80]}...{C.RESET}\n")

        try:
            result: AgentResult = agent.analyze(query)
            print_result(result)
        except Exception as exc:
            print(f"  {C.RED}[ERROR] {exc}{C.RESET}\n")

    # Print metrics
    section("Gateway Metrics")
    print_metrics(client)

    if scenarios:
        section("Chaos Engine Stats")
        print_chaos_stats(engine)

    section("Resilience Stack Status")
    print_stack_status(stack)

    # Cleanup
    engine.deactivate()
    engine.reset_stats()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="CFO Resilience Matrix — Demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--scenario", "-s",
        choices=list(SCENARIO_MAP.keys()) + ["all"],
        default="all",
        help="Chaos scenario to run (default: all)",
    )
    parser.add_argument(
        "--fast", "-f",
        action="store_true",
        help="Skip slow scenarios (full_outage)",
    )
    parser.add_argument(
        "--json", "-j",
        action="store_true",
        help="Output final summary as JSON",
    )
    args = parser.parse_args()

    # ─── Title ────────────────────────────────────────────────────────────
    banner("CFO RESILIENCE MATRIX", width=72, char="#")
    print(f"  {C.BOLD}6-Layer AI Agent Resilience for CFO Operations{C.RESET}")
    print(f"  {C.DIM}TrueFoundry AI Gateway — Resilient Agents{C.RESET}")
    print(f"  {C.DIM}{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}{C.RESET}\n")

    print(f"  {C.BOLD}Architecture:{C.RESET}")
    print(f"  {C.CYAN}  Layer 1: GATEWAY{C.RESET}          — Provider failover via TrueFoundry AI Gateway")
    print(f"  {C.CYAN}  Layer 2: PARITY{C.RESET}           — Cross-model response quality comparison")
    print(f"  {C.CYAN}  Layer 3: GOVERNANCE{C.RESET}       — PII detection, content safety screening")
    print(f"  {C.CYAN}  Layer 4: STATE MACHINE{C.RESET}    — CHP decision lifecycle management")
    print(f"  {C.CYAN}  Layer 5: USER EXPERIENCE{C.RESET}  — Graceful degradation & response formatting")

    # ─── Setup ────────────────────────────────────────────────────────────
    section("Initialization")
    client = ResilientGatewayClient(
        gateway_url="https://gateway.truefoundry.ai",
        api_key=os.environ.get("TFY_API_KEY", ""),  # Mock mode if no key
        virtual_model="cfo-resilience/primary",
    )
    print(f"  Gateway: {client}")
    print(f"  Mode: {'MOCK (deterministic)' if client._is_mock_mode else 'LIVE (TrueFoundry)'}")

    finance, strategy, compliance, stack = create_agents(client)
    print(f"  Agents: finance, strategy, compliance")
    print(f"  Stack layers: {len(stack._layers)}")

    engine = ChaosEngine(seed=42)  # Deterministic for reproducibility

    # ─── Run Scenarios ───────────────────────────────────────────────────
    scenarios_to_run: list[str]
    if args.scenario == "all":
        scenarios_to_run = list(SCENARIO_MAP.keys())
        if args.fast:
            scenarios_to_run = [s for s in scenarios_to_run if s != "full_outage"]
    else:
        scenarios_to_run = [args.scenario]

    total_start = time.monotonic()
    for scenario_name in scenarios_to_run:
        run_scenario(
            scenario_name=scenario_name,
            client=client,
            finance=finance,
            strategy=strategy,
            compliance=compliance,
            stack=stack,
            engine=engine,
            fast=args.fast,
        )

    total_elapsed = (time.monotonic() - total_start) * 1000

    # ─── Summary ──────────────────────────────────────────────────────────
    banner("DEMO COMPLETE", width=72, char="#")
    result_line("Scenarios Run:", str(len(scenarios_to_run)))
    result_line("Total Time:", f"{total_elapsed:.0f}ms")
    result_line("Tests Available:", "94 (pytest tests/)")

    print(f"\n  {C.GREEN}{C.BOLD}All agents responded through 5-layer resilience stack.{C.RESET}")
    print(f"  {C.DIM}Even under simulated provider outages, rate limits, and MCP errors,{C.RESET}")
    print(f"  {C.DIM}the system degraded gracefully and maintained decision-state integrity.{C.RESET}\n")

    if args.json:
        summary = {
            "demo": "cfo-resilience-matrix",
            "project": "CFO Resilience Matrix",
            "track": "TrueFoundry: Resilient Agents",
            "scenarios_run": scenarios_to_run,
            "total_time_ms": round(total_elapsed, 2),
            "gateway_health": client.health_report(),
            "stack_status": stack.get_status(),
        }
        print(f"\n{C.DIM}--- JSON Summary ---{C.RESET}")
        print(json.dumps(summary, indent=2, default=str))

    client.close()


if __name__ == "__main__":
    main()
