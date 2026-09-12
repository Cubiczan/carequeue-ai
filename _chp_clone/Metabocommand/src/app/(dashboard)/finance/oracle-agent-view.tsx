"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
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
  oracleKpis,
  oracleDemandForecast,
  oracleScenarioStack,
  oracleScenarios,
  type OracleScenario,
} from "@/lib/dummy-data";
import { formatCurrency, cn } from "@/lib/utils";

export function OracleAgentView() {
  const [isActive, setIsActive] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  async function submitForApproval(s: OracleScenario) {
    setSubmittingId(s.id);
    try {
      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "Oracle Agent",
          queue: "finance",
          action_description: `Approve ${s.name} (probability ${s.probability}%, break-even ${s.breakEvenDate}): ${s.recommendedAction}`,
          financial_impact: `${formatCurrency(s.capitalRequired)} capital commitment`,
          impact_amount: s.capitalRequired,
        }),
      });
      if (res.ok) {
        setSubmittedIds((prev) => new Set(prev).add(s.id));
      }
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Oracle Agent — Scenario Modeling Engine</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Probability-weighted demand forecasts and capital commitment scenarios
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
            label="Forecast Accuracy"
            value={`${oracleKpis.forecastAccuracy}%`}
            trend="up"
            subtext="+2.1% vs prior 90d"
          />
          <KpiCard
            label="Active Scenarios"
            value={String(oracleKpis.activeScenarios)}
            subtext="Probability-weighted"
          />
          <KpiCard
            label="Capital Deployment Lead Time"
            value={`${oracleKpis.capitalDeploymentLeadTime} days`}
            trend="down"
            subtext="-3 days vs prior 30d"
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Demand forecast — next 13 weeks (with 15% confidence band)
          </h3>
          <div className="rounded-md border border-slate-200 p-4 bg-white">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={oracleDemandForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) =>
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(Number(v ?? 0))
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="transparent"
                  fill="#6366f1"
                  fillOpacity={0.12}
                  name="Upper bound"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="transparent"
                  fill="#ffffff"
                  fillOpacity={1}
                  name="Lower bound"
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  name="Forecast"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Capital requirements — top 5 probability-weighted scenarios
          </h3>
          <div className="rounded-md border border-slate-200 p-4 bg-white">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={oracleScenarioStack}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) =>
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(Number(v ?? 0))
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="scenarioB" stackId="1" stroke="#4f46e5" fill="#4f46e5" name="Scenario B" />
                <Area type="monotone" dataKey="scenarioA" stackId="1" stroke="#10b981" fill="#10b981" name="Scenario A" />
                <Area type="monotone" dataKey="scenarioC" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Scenario C" />
                <Area type="monotone" dataKey="scenarioD" stackId="1" stroke="#ec4899" fill="#ec4899" name="Scenario D" />
                <Area type="monotone" dataKey="scenarioE" stackId="1" stroke="#14b8a6" fill="#14b8a6" name="Scenario E" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Active scenarios</h3>
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Scenario</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Probability</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Capital Required</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Break-even</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Recommended Action</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {oracleScenarios.map((s) => {
                  const submitted = submittedIds.has(s.id);
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 text-right">
                        <ProbabilityBadge value={s.probability} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {s.capitalRequired > 0 ? formatCurrency(s.capitalRequired) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.breakEvenDate}</td>
                      <td className="px-4 py-3 text-slate-700">{s.recommendedAction}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          disabled={!isActive || submitted || submittingId === s.id || s.capitalRequired === 0}
                          onClick={() => submitForApproval(s)}
                        >
                          {submitted
                            ? "Queued"
                            : submittingId === s.id
                            ? "Submitting…"
                            : "Submit for Approval"}
                        </Button>
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

function ProbabilityBadge({ value }: { value: number }) {
  const variant = value >= 60 ? "approved" : value >= 40 ? "pending" : "default";
  return <Badge variant={variant}>{value}%</Badge>;
}
