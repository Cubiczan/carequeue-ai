"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import {
  retentionKpis,
  retentionLtvTrend,
  retentionChurnSegments,
  retentionCampaigns,
  type RetentionCampaign,
} from "@/lib/dummy-data";
import { formatCurrency, cn } from "@/lib/utils";

export function RetentionAgentView() {
  const [isActive, setIsActive] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  async function submitCampaign(c: RetentionCampaign) {
    setSubmittingId(c.id);
    try {
      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "Retention Agent",
          queue: "operations",
          action_description: `Launch ${c.offerType} campaign for ${c.targetSegment} — projected ${c.projectedReactivation}% reactivation, ${formatCurrency(c.projectedRevenue)} recovered revenue`,
          financial_impact: `Est. ${formatCurrency(c.projectedRevenue)} recovered revenue`,
          impact_amount: c.projectedRevenue,
        }),
      });
      if (res.ok) setSubmittedIds((prev) => new Set(prev).add(c.id));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Retention Agent</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Churn prediction and win-back campaign orchestration
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
          <KpiCard label="Predicted Churn (30d)" value={`${retentionKpis.churnRate30d}%`} trend="down" subtext="-0.6% vs prior 30d" />
          <KpiCard label="Reactivation Rate" value={`${retentionKpis.reactivationRate}%`} trend="up" />
          <KpiCard label="LTV Growth" value={`+${retentionKpis.ltvGrowth}%`} trend="up" subtext="6-month trend" />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Customer LTV — 6-month trend</h3>
          <div className="rounded-md border border-slate-200 p-4 bg-white">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={retentionLtvTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => `$${v}`} />
                <Line type="monotone" dataKey="ltv" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Avg LTV" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Churn risk by segment</h3>
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Segment</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Size</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Churn Prob.</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Recommended Intervention</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Revenue at Risk</th>
                </tr>
              </thead>
              <tbody>
                {retentionChurnSegments.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.segment}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{s.size.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <ChurnProbPill value={s.churnProbability} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.intervention}</td>
                    <td className="px-4 py-3 text-right font-mono text-rose-700">
                      {formatCurrency(s.revenueAtRisk)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Win-back campaign proposals</h3>
          <div className="space-y-3">
            {retentionCampaigns.map((c) => {
              const submitted = submittedIds.has(c.id);
              return (
                <div key={c.id} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{c.targetSegment}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{c.offerType}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">Projected reactivation</span>{" "}
                          <span className="font-mono font-semibold text-emerald-700">{c.projectedReactivation}%</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Projected revenue</span>{" "}
                          <span className="font-mono font-semibold text-slate-900">{formatCurrency(c.projectedRevenue)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!isActive || submitted || submittingId === c.id}
                      onClick={() => submitCampaign(c)}
                    >
                      {submitted ? "Queued" : submittingId === c.id ? "Submitting…" : "Submit for Approval"}
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

function ChurnProbPill({ value }: { value: number }) {
  const color =
    value >= 60 ? "bg-rose-100 text-rose-800"
    : value >= 40 ? "bg-amber-100 text-amber-800"
    : value >= 20 ? "bg-yellow-100 text-yellow-800"
    : "bg-slate-100 text-slate-700";
  return (
    <Badge className={cn(color, "font-mono")}>
      {value}%
    </Badge>
  );
}
