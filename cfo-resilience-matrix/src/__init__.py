"""
CFO Resilience Matrix
=====================

A 6-layer AI agent resilience system using
TrueFoundry's AI Gateway.

Layers
------
1. **Gateway** — Provider failover via priority-based routing.
2. **Parity** — Cross-model response quality comparison.
3. **Governance** — PII / content-safety screening (EGIS).
4. **State Machine** — CHP-style decision lifecycle management.
5. **User Experience** — Graceful degradation and response formatting.

Quick Start
-----------
::

    from gateway import ResilientGatewayClient
    from layers import ResilienceStack
    from agents import create_agents

    client = ResilientGatewayClient()  # Uses TFY_API_KEY or mock mode
    finance, strategy, compliance, stack = create_agents(client)

    result = finance.analyze("What is our cash runway?")
    print(result.response)
    print(result.resilience_summary())
"""
