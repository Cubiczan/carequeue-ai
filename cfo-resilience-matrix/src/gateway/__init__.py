"""
CFO Resilience Matrix — Gateway Package
=========================================

TrueFoundry AI Gateway client with provider failover, retry logic,
and structured observability events.

Environment Variables
---------------------
TFY_GATEWAY_URL : str  (default ``https://gateway.truefoundry.ai``)
    Base URL of the TrueFoundry AI Gateway.
TFY_API_KEY : str
    API key used to authenticate with the gateway. **Required** for live
    traffic; the client falls back to mock responses when absent.
TFY_VIRTUAL_MODEL : str  (default ``cfo-resilience/primary``)
    The virtual model identifier routed through the gateway.
"""

from __future__ import annotations

from gateway.client import ResilientGatewayClient, GatewayMetrics, GatewayEvent

__all__ = [
    "ResilientGatewayClient",
    "GatewayMetrics",
    "GatewayEvent",
]
