"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { KpiCard } from "@/components/kpi-card";
import {
  acquisitionKpis,
  acquisitionCacTrend,
  acquisitionLtvCacHeatmap,
  acquisitionSpendAllocation,
  acquisitionProposals,
  type SpendReallocationProposal,
} from "@/lib/dummy-data";
import { formatCurrency, cn } from "@/lib/utils";

export function AcquisitionAgentView() {
  const [isActive, setIsActive] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  async function submitProposal(p: SpendReallocationProposal) {
    setSubmittingId(p.id);
    try {
      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "Acquisition Agent",
          queue: "operations",
          action_description: `Reallocate ${formatCurrency(p.amount)}/mo from ${p.fromChannel} (CAC $${p.currentCac}) to ${p.toChannel} (CAC $${p.projectedCac}) — projected CAC improvement ${p.cacImprovement}%`,
          financial_impact: `+${formatCurrency(p.amount)} channel shift`,
          impact_amount: p.amount,
        }),
      });
      if (res.ok) setSubmittedIds((prev) => new Set(prev).add(p.id));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Acquisition Agent</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            CAC optimization and spend reallocation across channels
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
            label="CAC (top channel)"
            value={`$${acquisitionKpis.cacTopChannel}`}
            subtext="Google Shopping"
            trend="down"
          />
          <KpiCard
            label="LTV:CAC Ratio"
            value={acquisitionKpis.ltvCacRatio.toFixed(1)}
            trend="up"
            subtext="Target ≥ 3.0"
          />
          <KpiCard
            label="Current Ad Spend"
            value={formatCurrency(acquisitionKpis.currentAdSpend)}
            subtext="Monthly"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">CAC trend by channel (30d)</h3>
            <div className="rounded-md border border-slate-200 p-4 bg-white">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={acquisitionCacTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => `$${Number(v ?? 0)}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="google" stroke="#4f46e5" strokeWidth={2} dot={false} name="Google" />
                  <Line type="monotone" dataKey="meta"   stroke="#3b82f6" strokeWidth={2} dot={false} name="Meta" />
                  <Line type="monotone" dataKey="tiktok" stroke="#ec4899" strokeWidth={2} dot={false} name="TikTok" />
                  <Line type="monotone" dataKey="email"  stroke="#10b981" strokeWidth={2} dot={false} name="Email" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Current spend allocation</h3>
            <div className="rounded-md border border-slate-200 p-4 bg-white">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={acquisitionSpendAllocation}
                    dataKey="amount"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={(entry: { name?: string }) => entry.name ?? ""}
                    labelLine={false}
                  >
                    {acquisitionSpendAllocation.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            LTV:CAC ratio by segment × channel
          </h3>
          <div className="rounded-md border border-slate-200 bg-white p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 pb-2 pr-3">Segment</th>
                  {acquisitionLtvCacHeatmap.channels.map((c) => (
                    <th key={c} className="text-xs font-medium text-slate-500 pb-2 px-2 text-center">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {acquisitionLtvCacHeatmap.segments.map((segment, i) => (
                  <tr key={segment}>
                    <td className="py-2 pr-3 font-medium text-slate-700">{segment}</td>
                    {acquisitionLtvCacHeatmap.grid[i].map((ratio, j) => (
                      <td key={j} className="p-1 text-center">
                        <div
                          className="rounded px-2 py-1 text-xs font-medium font-mono"
                          style={{
                            backgroundColor: ratio >= 3
                              ? `hsl(150, 70%, ${90 - ratio * 5}%)`
                              : ratio >= 2
                              ? `hsl(50, 85%, ${92 - ratio * 4}%)`
                              : `hsl(0, 80%, ${92 - ratio * 4}%)`,
                            color: ratio >= 3 ? "#065f46" : ratio >= 2 ? "#78350f" : "#7f1d1d",
                          }}
                        >
                          {ratio.toFixed(1)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Spend reallocation recommendations</h3>
          <div className="space-y-3">
            {acquisitionProposals.map((p) => {
              const submitted = submittedIds.has(p.id);
              return (
                <div key={p.id} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="font-medium text-slate-900">{p.fromChannel}</span>
                      <span className="text-xs text-rose-700 font-mono">CAC ${p.currentCac}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{p.toChannel}</span>
                      <span className="text-xs text-emerald-700 font-mono">CAC ${p.projectedCac}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-slate-500">CAC reduction</div>
                      <div className="font-semibold text-emerald-700">{p.cacImprovement}%</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-slate-500">Amount</div>
                      <div className="font-mono font-semibold">{formatCurrency(p.amount)}/mo</div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!isActive || submitted || submittingId === p.id}
                      onClick={() => submitProposal(p)}
                    >
                      {submitted ? "Queued" : submittingId === p.id ? "Submitting…" : "Submit for Approval"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
