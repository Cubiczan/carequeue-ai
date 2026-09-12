"""
Chaos Simulation Script — demonstrates resilience in action.

Simulates provider outages, MCP errors, and cascading failures
to show how ResilientAgent gracefully degrades.

Usage:
    python -m tools.chaos_demo
"""

import sys
import os
import time
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agent import (
    ResilientLLMClient,
    ResilientAgentOrchestrator,
    ChaosSimulator,
    VIRTUAL_MODELS,
)


def print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def print_metrics(client: ResilientLLMClient):
    m = client.metrics
    print(f"  Total Requests: {m.total_requests}")
    print(f"  Successful:     {m.successful_requests}")
    print(f"  Fallbacks:      {m.fallback_used}")
    print(f"  Cache Hits:     {m.cache_used}")
    print(f"  Circuit Trips:  {m.circuit_breaker_trips}")
    print(f"  Errors:         {m.errors}")
    print(f"  Cache Size:     {client.cache.stats['size']}/{client.cache.stats['max']}")
    cb_states = {k: cb.state.value for k, cb in client.circuit_breakers.items()}
    print(f"  Circuits:       {json.dumps(cb_states)}")


def demo():
    print_header("ResilientAgent — Chaos Simulation Demo")
    print(f"  Gateway: {VIRTUAL_MODELS}")
    print(f"  Fallback chain: orchestrator → analyst → executor → fallback\n")

    client = ResilientLLMClient()
    chaos = ChaosSimulator(client)

    # =========================================================================
    # SCENARIO 1: Normal Operation
    # =========================================================================
    print_header("SCENARIO 1: Normal Operation")
    print("  Sending query to orchestrator...")
    result = client.chat(
        messages=[{"role": "user", "content": "What is 2+2?"}],
        role="orchestrator",
    )
    print(f"  Source:  {result['source']}")
    print(f"  Model:   {result['model']}")
    print(f"  Latency: {result['latency_ms']}ms")
    print(f"  Degraded: {result['degraded']}")
    print_metrics(client)

    # =========================================================================
    # SCENARIO 2: Primary LLM Fails — Fallback Activates
    # =========================================================================
    print_header("SCENARIO 2: Primary LLM (Claude Sonnet) Goes Down")
    print("  Injecting chaos: orchestrator model now failing...")
    chaos.fail_model("orchestrator")

    # First request — will fail, then fallback
    print("  Sending query (should fallback to analyst/GPT-4o)...")
    result = client.chat(
        messages=[{"role": "user", "content": "Analyze Q3 revenue trends"}],
        role="orchestrator",
    )
    print(f"  Source:  {result['source']}")
    print(f"  Model:   {result['model']}")
    print(f"  Latency: {result['latency_ms']}ms")
    print(f"  Degraded: {result['degraded']}")
    print_metrics(client)

    # =========================================================================
    # SCENARIO 3: Circuit Breaker Trips
    # =========================================================================
    print_header("SCENARIO 3: Circuit Breaker Trip")
    print("  Orchestrator circuit should be OPEN now")
    cb = client.circuit_breakers["orchestrator"]
    print(f"  Circuit state: {cb.state.value}")
    print(f"  Failure count: {cb._failure_count}/{cb.failure_threshold}")

    # Another request — should skip open circuit
    print("  Sending another query...")
    result = client.chat(
        messages=[{"role": "user", "content": "Create summary report"}],
        role="orchestrator",
    )
    print(f"  Source:  {result['source']} (skipped open circuit)")
    print(f"  Degraded: {result['degraded']}")
    print_metrics(client)

    # =========================================================================
    # SCENARIO 4: Cascade Failure — Multiple Models Down
    # =========================================================================
    print_header("SCENARIO 4: Cascade — 3 of 4 Models Down")
    print("  Failing orchestrator, analyst, and executor...")
    chaos.fail_model("analyst")
    chaos.fail_model("executor")
    print("  Only 'fallback' (Claude Haiku) remains healthy")

    result = client.chat(
        messages=[{"role": "user", "content": "Generate quarterly insights"}],
        role="orchestrator",
    )
    print(f"  Source:  {result['source']}")
    print(f"  Model:   {result['model']}")
    print(f"  Latency: {result['latency_ms']}ms")
    print(f"  Degraded: {result['degraded']}")
    print_metrics(client)

    # =========================================================================
    # SCENARIO 5: Cache Rescue
    # =========================================================================
    print_header("SCENARIO 5: Cache Rescue — Repeat Query During Outage")
    print("  Sending the same query again...")
    print("  Should hit cache (instant response even with models down)")
    result = client.chat(
        messages=[{"role": "user", "content": "Generate quarterly insights"}],
        role="orchestrator",
    )
    print(f"  Source:  {result['source']}")
    print(f"  Latency: {result['latency_ms']}ms (cached = instant)")
    print_metrics(client)

    # =========================================================================
    # SCENARIO 6: Total Failure — All Models Down
    # =========================================================================
    print_header("SCENARIO 6: Total Failure — All Models Down")
    print("  Failing all models including fallback...")
    chaos.fail_model("fallback")

    print("  Sending query with NO healthy models...")
    result = client.chat(
        messages=[{"role": "user", "content": "New query not in cache"}],
        role="orchestrator",
    )
    print(f"  Source:  {result['source']}")
    print(f"  Degraded: {result['degraded']}")
    print(f"  Response: {result['content'][:100]}...")
    print_metrics(client)

    # =========================================================================
    # SCENARIO 7: Recovery
    # =========================================================================
    print_header("SCENARIO 7: Recovery — Systems Restored")
    chaos.restore()
    print("  All circuits reset, all models healthy")
    print("  Waiting for circuit breaker recovery timeout...")
    time.sleep(1)

    print("  Sending post-recovery query...")
    result = client.chat(
        messages=[{"role": "user", "content": "Systems are back online!"}],
        role="orchestrator",
    )
    print(f"  Source:  {result['source']}")
    print(f"  Model:   {result['model']}")
    print(f"  Degraded: {result['degraded']}")
    print_metrics(client)

    # =========================================================================
    # SUMMARY
    # =========================================================================
    print_header("SIMULATION COMPLETE")
    m = client.metrics
    print(f"  Total requests processed: {m.total_requests}")
    print(f"  Successful (primary):     {m.successful_requests}")
    print(f"  Handled via fallback:     {m.fallback_used}")
    print(f"  Served from cache:        {m.cache_used}")
    print(f"  Circuit breaker trips:    {m.circuit_breaker_trips}")
    print(f"  Total errors:             {m.errors}")
    print(f"\n  Key Takeaway: The agent handled EVERY request —")
    print(f"  users never saw an unhandled error, even during total outage.\n")


if __name__ == "__main__":
    demo()
