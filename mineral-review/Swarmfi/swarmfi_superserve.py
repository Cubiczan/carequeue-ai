"""
SwarmFi Verifiable Resolution — SuperServe Sandbox Integration
===============================================================

Integrates SwarmFi prediction market resolution with SuperServe sandboxes
for verifiable, isolated execution. Every resolution runs in a Firecracker
microVM and produces an audit trail with:

    - sandbox_id (which VM ran the calculation)
    - Full stdout/stderr (the execution trace)
    - JSON outcome parsing
    - Constraint validation

Usage:
    from cubiczan.superserve import SwarmFiResolver, SwarmFiResolution

    resolver = SwarmFiResolver(
        timeout_seconds=120,
        constraints={"require_json_output": True},
    )

    resolution = resolver.resolve_market(
        market_id="mkt-0x1234",
        resolution_code='import json; print(json.dumps({"outcome": "YES", "price": 0.95}))',
    )

    if resolution.verified:
        record = resolution.to_audit_record()
        # Store record in on-chain or DB

    # Batch resolve
    resolutions = resolver.resolve_batch([
        ("mkt-0x1", "print(json.dumps({'outcome': 'YES'}))"),
        ("mkt-0x2", "print(json.dumps({'outcome': 'NO'}))"),
    ])

CLI:
    python -m swarmfi_superserve resolve "mkt-001" 'print("{\\"outcome\\": \\"YES\\"}")'
    python -m swarmfi_superserve resolve-batch markets.json
"""

import json
import sys
import os

# Ensure cubiczan package is available
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from cubiczan.superserve import SwarmFiResolver, SwarmFiResolution


def cli():
    """Command-line interface for SwarmFi Verifiable Resolution."""
    import argparse

    parser = argparse.ArgumentParser(
        description="SwarmFi Resolver — Sandboxed Market Resolution with Audit Trail"
    )
    sub = parser.add_subparsers(dest="command")

    # resolve single market
    resolve = sub.add_parser("resolve", help="Resolve a single market")
    resolve.add_argument("market_id", help="Market ID (e.g. mkt-0x1234)")
    resolve.add_argument("code", help="Resolution Python code (prints JSON)")
    resolve.add_argument("--timeout", type=int, default=180, help="Sandbox timeout (seconds)")
    resolve.add_argument("--env", nargs="*", help="Env vars KEY=VALUE pairs")

    # batch
    batch = sub.add_parser("resolve-batch", help="Resolve multiple markets from JSON")
    batch.add_argument("file", help="JSON file: [{market_id, code, env_vars?}]")
    batch.add_argument("--timeout", type=int, default=180)

    args = parser.parse_args()

    if args.command == "resolve":
        env_vars = {}
        if args.env:
            for pair in args.env:
                k, v = pair.split("=", 1)
                env_vars[k] = v

        resolver = SwarmFiResolver(timeout_seconds=args.timeout)
        resolution = resolver.resolve_market(args.market_id, args.code, env_vars=env_vars)
        result = resolution.to_audit_record()
        result["outcome"] = resolution.outcome
        result["full_stdout"] = resolution.full_stdout[:2000]
        result["full_stderr"] = resolution.full_stderr[:1000]
        print(json.dumps(result, indent=2))

    elif args.command == "resolve-batch":
        with open(args.file) as f:
            data = json.load(f)

        markets = []
        for item in data:
            markets.append((item["market_id"], item["code"]))

        resolver = SwarmFiResolver(timeout_seconds=args.timeout)
        resolutions = resolver.resolve_batch(markets)

        output = {
            "total": len(resolutions),
            "verified": sum(1 for r in resolutions if r.verified),
            "failed": sum(1 for r in resolutions if not r.verified),
            "resolutions": [r.to_audit_record() for r in resolutions],
        }
        print(json.dumps(output, indent=2))

    else:
        parser.print_help()


if __name__ == "__main__":
    cli()
