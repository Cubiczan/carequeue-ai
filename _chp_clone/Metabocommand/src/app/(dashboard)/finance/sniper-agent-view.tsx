"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import {
  sniperKpis,
  sniperExpenseScatter,
  sniperVelocityByCategory,
  sniperWasteProposals,
  type WasteProposal,
} from "@/lib/dummy-data";
import { formatCurrency, cn } from "@/lib/utils";

const AUTO_EXECUTE_THRESHOLD = 500;

export function SniperAgentView() {
  const [isActive, setIsActive] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [autoExecutedIds, setAutoExecutedIds] = useState<Set<string>>(new Set());

  async function submitForApproval(w: WasteProposal) {
    setSubmittingId(w.id);
    try {
      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "Sniper Agent",
          queue: "finance",
          action_description: `${w.proposedAction} ${w.item} ($${w.monthlyCost}/mo) — velocity score ${w.velocityScore}, projected savings ${formatCurrency(w.projectedSavingsAnnual)}/yr`,
          financial_impact: `-${formatCurrency(w.projectedSavingsAnnual)}/yr saved`,
          impact_amount: -w.projectedSavingsAnnual,
        }),
      });
      if (res.ok) setSubmittedIds((prev) => new Set(prev).add(w.id));
    } finally {
      setSubmittingId(null);
    }
  }

  function autoExecute(w: WasteProposal) {
    setAutoExecutedIds((prev) => new Set(prev).add(w.id));
    // In a real build, this would POST to an "auto-execute" endpoint that logs to agent_action_log.
    // For MVP dummy mode we just visually mark it.
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Sniper Agent — Waste Elimination Reflex</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Identifies low-velocity spend and proposes cancel / renegotiate / reallocate actions
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
            label="Total Waste Identified"
            value={formatCurrency(sniperKpis.totalWasteIdentified)}
            trend="down"
            subtext="Monthly run-rate"
          />
          <KpiCard
            label="Projected Quarterly Savings"
            value={formatCurrency(sniperKpis.projectedQuarterlySavings)}
            trend="up"
          />
          <KpiCard
            label="Low-Velocity Initiatives"
            value={String(sniperKpis.lowVelocityInitiatives)}
            trend="down"
            subtext="Flagged below 0.30"
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Capital deployed vs LTV contribution (waste zone highlighted)
          </h3>
          <div className="rounded-md border border-slate-200 p-4 bg-white">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="capitalDeployed"
                  name="Capital Deployed"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  label={{ value: "Capital Deployed", position: "insideBottom", offset: -5, fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  type="number"
                  dataKey="ltvContribution"
                  name="LTV Contribution"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  label={{ value: "LTV Contribution", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }}
                />
                <ZAxis range={[60, 200]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as typeof sniperExpenseScatter[number];
                    return (
                      <div className="rounded-md bg-white border border-slate-200 px-3 py-2 shadow-md text-xs">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-slate-600 mt-1">Category: {p.category}</div>
                        <div className="text-slate-600">Capital: {formatCurrency(p.capitalDeployed)}</div>
                        <div className="text-slate-600">LTV: {formatCurrency(p.ltvContribution)}</div>
                      </div>
                    );
                  }}
                />
                <ReferenceArea
                  x1={0}
                  x2={30000}
                  y1={0}
                  y2={5000}
                  fill="#fee2e2"
                  fillOpacity={0.5}
                  label={{ value: "Waste zone", fontSize: 10, fill: "#991b1b" }}
                />
                <Scatter data={sniperExpenseScatter} fill="#4f46e5" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Velocity score by expense category
          </h3>
          <div className="rounded-md border border-slate-200 p-4 bg-white">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sniperVelocityByCategory} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="velocity" radius={[0, 4, 4, 0]}>
                  {sniperVelocityByCategory.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.velocity >= 1.5
                          ? "#10b981"
                          : entry.velocity >= 1.0
                          ? "#6366f1"
                          : entry.velocity >= 0.5
                          ? "#f59e0b"
                          : "#f43f5e"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Waste elimination proposals</h3>
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Item</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Monthly Cost</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Velocity</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Action</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Projected Savings / yr</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sniperWasteProposals.map((w) => {
                  const isAutoExecute = w.monthlyCost < AUTO_EXECUTE_THRESHOLD;
                  const submitted = submittedIds.has(w.id);
                  const autoExecuted = autoExecutedIds.has(w.id);
                  return (
                    <tr key={w.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-900">{w.item}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        ${w.monthlyCost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <VelocityPill value={w.velocityScore} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={w.proposedAction === "Cancel" ? "rejected" : w.proposedAction === "Renegotiate" ? "pending" : "reviewing"}>
                          {w.proposedAction}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        -{formatCurrency(w.projectedSavingsAnnual)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isAutoExecute ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!isActive || autoExecuted}
                            onClick={() => autoExecute(w)}
                          >
                            {autoExecuted ? (
                              <>
                                <Zap className="h-3.5 w-3.5" />
                                Executed
                              </>
                            ) : (
                              <>
                                <Zap className="h-3.5 w-3.5" />
                                Auto-Execute
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!isActive || submitted || submittingId === w.id}
                            onClick={() => submitForApproval(w)}
                          >
                            {submitted
                              ? "Queued"
                              : submittingId === w.id
                              ? "Submitting…"
                              : "Submit for CFO Approval"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Items under ${AUTO_EXECUTE_THRESHOLD}/mo auto-execute within threshold; items at or above require CFO approval.
          </p>
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
