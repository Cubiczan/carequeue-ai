"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import {
  conductorKpis,
  conductorLiquidityThresholds,
  conductorInitiatives,
  conductorReallocations,
  type ReallocationFlow,
  type Initiative,
} from "@/lib/dummy-data";
import { formatCurrency, cn } from "@/lib/utils";

export function ConductorAgentView() {
  const [isActive, setIsActive] = useState(true);
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [submittedKeys, setSubmittedKeys] = useState<Set<string>>(new Set());

  async function submitReallocation(f: ReallocationFlow) {
    const key = `${f.from}->${f.to}`;
    setSubmittingKey(key);
    try {
      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "Conductor Agent",
          queue: "finance",
          action_description: `Reallocate ${formatCurrency(f.amount)} from ${f.from} (velocity ${f.fromVelocity}) to ${f.to} (velocity ${f.toVelocity})`,
          financial_impact: `+${formatCurrency(f.amount)} reallocation`,
          impact_amount: f.amount,
        }),
      });
      if (res.ok) setSubmittedKeys((prev) => new Set(prev).add(key));
    } finally {
      setSubmittingKey(null);
    }
  }

  const liquidityPct = Math.round(
    (conductorKpis.availableLiquidity / conductorLiquidityThresholds.max) * 100
  );

  const liquidityTier =
    conductorKpis.availableLiquidity < conductorLiquidityThresholds.critical
      ? { label: "Critical", color: "#f43f5e" }
      : conductorKpis.availableLiquidity < conductorLiquidityThresholds.healthy
      ? { label: "Watch", color: "#f59e0b" }
      : { label: "Healthy", color: "#10b981" };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Conductor Agent — Capital Orchestration</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Ranks initiatives by velocity and proposes capital reallocations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", isActive ? "text-emerald-700" : "text-slate-500")}>
            {isActive ? "Active" : "Paused"}
          </span>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            label="Available Liquidity"
            value={formatCurrency(conductorKpis.availableLiquidity)}
            subtext={liquidityTier.label}
          />
          <KpiCard
            label="Active Capital Requests"
            value={String(conductorKpis.activeCapitalRequests)}
          />
          <KpiCard
            label="Velocity-Weighted ROI"
            value={conductorKpis.velocityWeightedROI.toFixed(2)}
            trend="up"
            subtext="+0.18 vs prior 30d"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Liquidity gauge</h3>
            <div className="rounded-md border border-slate-200 p-4 bg-white">
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    startAngle={180}
                    endAngle={0}
                    data={[{ name: "liquidity", value: liquidityPct, fill: liquidityTier.color }]}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar
                      dataKey="value"
                      cornerRadius={8}
                      background={{ fill: "#e2e8f0" }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-6">
                  <div className="text-3xl font-bold text-slate-900">
                    {formatCurrency(conductorKpis.availableLiquidity)}
                  </div>
                  <div className="text-xs font-medium" style={{ color: liquidityTier.color }}>
                    {liquidityTier.label}
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2 px-1">
                <span>Critical &lt; {formatCurrency(conductorLiquidityThresholds.critical)}</span>
                <span>Healthy ≥ {formatCurrency(conductorLiquidityThresholds.healthy)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Proposed reallocation flows</h3>
            <div className="rounded-md border border-slate-200 bg-white divide-y divide-slate-100">
              {conductorReallocations.map((f) => {
                const key = `${f.from}->${f.to}`;
                const submitted = submittedKeys.has(key);
                return (
                  <div key={key} className="p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-500 text-xs">From</div>
                        <div className="font-medium text-slate-900 truncate">{f.from}</div>
                        <div className="text-xs text-rose-700 font-mono">velocity {f.fromVelocity}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-500 text-xs">To</div>
                        <div className="font-medium text-slate-900 truncate">{f.to}</div>
                        <div className="text-xs text-emerald-700 font-mono">velocity {f.toVelocity}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs text-slate-500">Amount</div>
                        <div className="font-mono font-semibold text-slate-900">{formatCurrency(f.amount)}</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        disabled={!isActive || submitted || submittingKey === key}
                        onClick={() => submitReallocation(f)}
                      >
                        {submitted
                          ? "Queued"
                          : submittingKey === key
                          ? "Submitting…"
                          : "Submit for CFO Approval"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Priority matrix — active initiatives ranked by velocity
          </h3>
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Initiative</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Capital</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Velocity</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Priority</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {conductorInitiatives.map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{i.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(i.capitalRequested)}</td>
                    <td className="px-4 py-3 text-right">
                      <VelocityPill value={i.velocityScore} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={i.strategicPriority} />
                    </td>
                    <td className="px-4 py-3">
                      <InitiativeStatusBadge status={i.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VelocityPill({ value }: { value: number }) {
  const color =
    value >= 1.5 ? "bg-emerald-100 text-emerald-800"
    : value >= 1.0 ? "bg-indigo-100 text-indigo-800"
    : value >= 0.5 ? "bg-amber-100 text-amber-800"
    : "bg-rose-100 text-rose-800";
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium font-mono", color)}>{value.toFixed(2)}</span>;
}

function PriorityBadge({ priority }: { priority: Initiative["strategicPriority"] }) {
  const variant = priority === "High" ? "approved" : priority === "Medium" ? "pending" : "default";
  return <Badge variant={variant}>{priority}</Badge>;
}

function InitiativeStatusBadge({ status }: { status: Initiative["status"] }) {
  const variant =
    status === "Approved" ? "approved"
    : status === "Rejected" ? "rejected"
    : status === "On Hold" ? "idle"
    : "pending";
  return <Badge variant={variant}>{status}</Badge>;
}
