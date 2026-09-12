The Kroer–Dudík “Frank‑Wolfe market maker” shows exactly how to use Frank‑Wolfe as a Bregman projection to remove arbitrage in prediction markets: compute the Bregman projection of current prices onto the set of coherent distributions, and the divergence equals max arbitrage profit. Your strategy is basically “run a light‑weight version client‑side and trade up to that bound.”

For a single market with prices p∈R 
n
 :

Normalize to the simplex:
p 
i
 =orderbook mid/sum.

Define feasible set M: all μ in the simplex consistent with no‑arb (for simple Polymarket markets, this is just the simplex; for cross‑market constraints, add linear equalities/inequalities).

Bregman projection:
μ 
\*
 =argmin 
μ∈M
 D(μ∥θ) where D is KL and θ is current price vector.

Frank‑Wolfe: use conditional gradient iterations over M to approximate μ 
\*
 .

Trade: move the market from θ towards μ 
\*
  up to your max position and slippage constraints; guaranteed profit is D(μ 
\*
 ∥θ) minus fees.

This is exactly the “Bregman Projection Arbitrage” described in that Polymarket bot write‑up: scan ~500 markets every 30 seconds, compute divergences, and only act on clean violations.

2. OpenClaw + PolyClaw integration plan
OpenClaw already supports “skills” that poll APIs and trigger actions; the PolyClaw skill is a Polymarket‑focused wrapper built on the CLOB API with Python scripts for scanning and hedging.

2.1 Repo + env
Clone OpenClaw and set up env as in the PolyClaw guide.

Configure:

CHAINSTACK_NODE (Polygon RPC)

POLYCLAW_PRIVATE_KEY (funded arb wallet)

OPENROUTER_API_KEY (for LLM‑assisted monitoring if you want).

2.2 New skill: bregman_fw_arb
Extend scripts/polyclaw.py (or add scripts/bregman_arb.py) with:

markets scan: call existing market listing endpoints and cache:

Outcome set and current bid/ask/mid for each YES/NO or multi‑outcome line.

arb detect: for each market (and defined bundles for cross‑market constraints), run your Bregman/Frank‑Wolfe routine, return opportunities:

market_id, type (simple / multi / cross), expected_profit, size, legs.

Wire this into OpenClaw’s scheduler so it runs every 30 seconds, same cadence as current paper strategy.

3. Algorithmic details to implement
3.1 Simple and multi‑outcome arbitrage
These can be done both with closed‑form checks and FW‑style projection:

Simple binary arb:

If best YES price + best NO price < 1 − fees − MIN_PROFIT_PCT, buy both legs sized to MAX_POSITION_SIZE and orderbook depth.

Multi‑outcome:

If sum of “complete cover” (e.g., buy all outcome NOs, or appropriate bundle) < 1 − margin, it’s arb; Bregman projection refines the optimal weights.

From a code standpoint, you can shortcut:

Let p be normalized prices.

If ∑p 
i
 

=1, or any constraint is violated, compute mispricing score:

Use KL divergence D(μ 
\*
 ∥θ) from FW projection as your unified arb metric.

Only act when:

D(μ 
\*
 ∥θ)≥MIN_PROFIT_PCT+fees+slippage buffer.
3.2 Frank‑Wolfe loop
Your pseudocode is essentially the classical FW loop:

ts
let current = initializeOnSimplex(marketPrices); // θ

for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
  const gradient = computeGradient(current, marketPrices);   // ∇D(µ||θ)
  const vertex   = argminOverSimplex(gradient);              // e_k with smallest gradient
  const stepSize = 2 / (iter + 2);                           // standard FW schedule
  const previous = current;
  current = blend(current, vertex, stepSize);                // convex combo

  if (converged(current, previous)) break;
}

const muStar = current;
const divergence = klDivergence(muStar, marketPrices);
Implementation notes:

Gradient for KL D(μ∥θ) w.r.t. μ is log(μ 
i
 /θ 
i
 )+1; keep numerics stable via small eps clamps.

argminOverSimplex is just picking the coordinate with lowest gradient (simplex vertex).

You can stay with the standard step size; adaptive fully‑corrective FW is overkill at current scale but worth adding later.

3.3 Execution sizing and guards
Use your parameters as hard constraints:

MIN_PROFIT_PCT = 0.5%, MIN_PROFIT_USDC = 0.50: compute worst‑case payout vs cost net of fees and gas before sending any orders.

MAX_SLIPPAGE = 5%:

Simulate walking the book to your desired size; if VWAP exceeds threshold, downsize or skip.

MAX_POSITION_SIZE = 10%:

Cap per arbitrage vs portfolio equity; keep cumulative exposure by market and side.

On each candidate arb:

Build order plan using live orderbook (not mid) for each leg.

Compute executed price vs theoretical arb price and expected P&L under worst‑case resolution.

If both the pct and absolute thresholds pass, proceed; else skip.

4. OpenClaw orchestration and monitoring
4.1 Trading engine integration
Within OpenClaw’s “Trading Engine” component, register a new strategy module:

strategy_id: "bregman_projection_arb"

Hooks:

on_scan_cycle(): run detection, generate candidate trades.

risk_check(order_bundle): enforce position/PNL limits.

execute(order_bundle): call PolyClaw buy/sell helpers.

4.2 Dashboard and alerts
Vercel dashboard (Next.js 14) can show, per cycle:

Markets scanned.

Divergence histogram (KL or other Bregman).

Executed arb trades with realized and theoretical P&L.

Telegram:

Alert on each executed arb with:

market name, type, size, locked-in profit, current PnL.

Optional warning when failed leg occurs and hedge kicks in.

5. Execution safeguards beyond the basics
Given the Reddit bot example where earlier strategies lost ~38%, you want stronger guardrails than “math says it’s arb.”

Add:

Orderbook integrity checks

Ignore markets with clear spoofing: large best quotes but almost no depth behind the top level, or quotes that vanish repeatedly right before your expected fill window.

Latency & execution risk

Measure time between taking leg A and successfully placing leg B; if latency or rejection rates spike, auto‑throttle or pause the strategy.

Protocol / contract risk filter

Maintain a whitelist of Polymarket markets and categories you are willing to trade (avoid obscure contracts with settlement/edge‑case ambiguity).

Outcome‑definition sanity

For cross‑market arbitrage, encode logical constraints with a small DSL, and test them against historical data or known events before trusting them in size.

6. Rollout plan
Paper mode in OpenClaw (you’re here)

Keep running every 30s, store: divergence, theoretical arb P&L, “would‑be” fills based on the book.

Dry‑run with tiny real capital (e.g., 50–100 USDC)

Enable a “max notional per day” and “max loss per day = 2–3% of bankroll.”

Parameter tuning

Adjust MIN_PROFIT_PCT, slippage, and FW iteration count based on realized slippage and failed‑leg frequency.

Scale slowly

Every time realized P&L over 1–2 weeks is significantly below theoretical P&L, diagnose: is it fees, slippage, liquidity, or logical/latency issues?

draft a concrete bregman_fw_arb.py skeleton (Python pseudo‑code) wired to PolyClaw’s existing CLI so you can drop it into the repo and iterate.

