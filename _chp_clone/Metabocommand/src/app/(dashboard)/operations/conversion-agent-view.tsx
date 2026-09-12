"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  conversionKpis,
  conversionFunnel,
  conversionDevice,
  conversionAbTests,
  type AbTest,
} from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

const AUTO_ROLLOUT_THRESHOLD = 10; // %

export function ConversionAgentView() {
  const [isActive, setIsActive] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [rolledOutIds, setRolledOutIds] = useState<Set<string>>(new Set());

  async function submitForApproval(t: AbTest) {
    setSubmittingId(t.id);
    try {
      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "Conversion Agent",
          queue: "operations",
          action_description: `Roll out ${t.variant} of "${t.name}" to 100% traffic — measured +${t.conversionLift}% conversion lift`,
          financial_impact: `+${t.conversionLift}% conversion lift`,
          impact_amount: null,
        }),
      });
      if (res.ok) setSubmittedIds((prev) => new Set(prev).add(t.id));
    } finally {
      setSubmittingId(null);
    }
  }

  function autoRollout(t: AbTest) {
    setRolledOutIds((prev) => new Set(prev).add(t.id));
  }

  const maxFunnelUsers = Math.max(...conversionFunnel.map((s) => s.users));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Conversion Agent</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Funnel optimization and A/B test rollout orchestration
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
          <KpiCard label="Conversion Rate" value={`${conversionKpis.conversionRate}%`} trend="up" subtext="+0.3% vs prior 30d" />
          <KpiCard label="Average Order Value" value={`$${conversionKpis.averageOrderValue}`} />
          <KpiCard label="Cart Abandonment" value={`${conversionKpis.cartAbandonmentRate}%`} trend="down" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Conversion funnel</h3>
            <div className="rounded-md border border-slate-200 p-4 bg-white space-y-2">
              {conversionFunnel.map((step, i) => {
                const pct = (step.users / maxFunnelUsers) * 100;
                const prevUsers = i > 0 ? conversionFunnel[i - 1].users : step.users;
                const conv = i > 0 ? ((step.users / prevUsers) * 100).toFixed(1) : null;
                return (
                  <div key={step.step} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium text-slate-700">{step.step}</div>
                    <div className="flex-1 relative h-8 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-end pr-3"
                        style={{ width: `${pct}%` }}
                      >
                        <span className="text-xs font-semibold text-white font-mono">
                          {step.users.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-14 text-right text-xs text-slate-500 font-mono">
                      {conv ? `${conv}%` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Conversion rate by device</h3>
            <div className="rounded-md border border-slate-200 p-4 bg-white">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={conversionDevice}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="device" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                    {conversionDevice.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.rate >= 4 ? "#10b981" : entry.rate >= 3 ? "#6366f1" : "#f59e0b"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">A/B test results</h3>
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Test Name</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Variant</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Lift</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Status</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Rollout</th>
                </tr>
              </thead>
              <tbody>
                {conversionAbTests.map((t) => {
                  const canAutoRollout = t.autoRollout && t.conversionLift < AUTO_ROLLOUT_THRESHOLD && t.status === "Winning";
                  const needsApproval = t.conversionLift >= AUTO_ROLLOUT_THRESHOLD && (t.status === "Winning" || t.status === "Completed");
                  const submitted = submittedIds.has(t.id);
                  const rolled = rolledOutIds.has(t.id);
                  return (
                    <tr key={t.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                      <td className="px-4 py-3 text-slate-700">{t.variant}</td>
                      <td className={cn("px-4 py-3 text-right font-mono", t.conversionLift > 0 ? "text-emerald-700" : "text-rose-700")}>
                        {t.conversionLift > 0 ? "+" : ""}{t.conversionLift}%
                      </td>
                      <td className="px-4 py-3">
                        <TestStatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canAutoRollout ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!isActive || rolled}
                            onClick={() => autoRollout(t)}
                          >
                            {rolled ? "Rolled out" : "Auto-Roll Out"}
                          </Button>
                        ) : needsApproval ? (
                          <Button
                            size="sm"
                            disabled={!isActive || submitted || submittingId === t.id}
                            onClick={() => submitForApproval(t)}
                          >
                            {submitted ? "Queued" : submittingId === t.id ? "Submitting…" : "Submit for Approval"}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TestStatusBadge({ status }: { status: AbTest["status"] }) {
  const variant =
    status === "Winning" ? "approved"
    : status === "Losing" ? "rejected"
    : status === "Completed" ? "reviewing"
    : "idle";
  return <Badge variant={variant}>{status}</Badge>;
}
