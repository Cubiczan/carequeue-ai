"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AlertTriangle, TrendingDown, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { KpiCard } from "@/components/kpi-card";
import {
  capitalFlow30d,
  pulseAlerts,
  pulseAgentKpis,
  vendorMarginHeatmap,
} from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

export function PulseAgentView() {
  const [isActive, setIsActive] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  async function queueForApproval(alertId: string, alert: typeof pulseAlerts[number]) {
    setSubmittingId(alertId);
    try {
      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "Pulse Agent",
          queue: "finance",
          action_description: `${alert.type}: ${alert.description}`,
          financial_impact: `Velocity impact ${alert.velocityImpact}`,
          impact_amount: null,
        }),
      });
      if (res.ok) {
        setSubmittedIds((prev) => new Set(prev).add(alertId));
      }
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pulse Agent — Capital Health Monitor</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Detects anomalies, margin erosion, and spend deviations in real time
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
            label="Anomaly Count"
            value={String(pulseAgentKpis.anomalyCount)}
            trend="down"
            subtext="Open items"
          />
          <KpiCard
            label="Margin Erosion Alerts"
            value={String(pulseAgentKpis.marginErosionAlerts)}
            trend="down"
          />
          <KpiCard
            label="Spend Deviation Flags"
            value={String(pulseAgentKpis.spendDeviationFlags)}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Capital flows (last 30 days)
          </h3>
          <div className="rounded-md border border-slate-200 p-4 bg-white">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={capitalFlow30d}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => d.slice(5)}
                />
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
                <Line type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} dot={false} name="Inflow" />
                <Line type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} dot={false} name="Outflow" />
                <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2} dot={false} name="Net" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Contribution margin by vendor × week
          </h3>
          <div className="rounded-md border border-slate-200 bg-white p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 pb-2 pr-3">Vendor</th>
                  {vendorMarginHeatmap.weeks.map((w) => (
                    <th key={w} className="text-xs font-medium text-slate-500 pb-2 px-2 text-center">
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendorMarginHeatmap.vendors.map((vendor, i) => (
                  <tr key={vendor}>
                    <td className="py-2 pr-3 font-medium text-slate-700">{vendor}</td>
                    {vendorMarginHeatmap.grid[i].map((value, j) => (
                      <td key={j} className="p-1 text-center">
                        <div
                          className="rounded px-2 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `hsl(${(value / 100) * 120}, 70%, ${85 - value / 4}%)`,
                            color: value > 50 ? "#064e3b" : "#7f1d1d",
                          }}
                        >
                          {value}%
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
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Alert feed</h3>
          <div className="space-y-3">
            {pulseAlerts.map((alert) => {
              const submitted = submittedIds.has(alert.id);
              return (
                <div
                  key={alert.id}
                  className="rounded-md border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {alert.type === "Margin Erosion" ? (
                        <TrendingDown className="h-4 w-4 text-rose-600" />
                      ) : alert.type === "Spend Deviation" ? (
                        <Zap className="h-4 w-4 text-amber-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          {alert.type}
                        </div>
                        <div className="text-xs text-slate-500">
                          Velocity impact <span className="font-mono font-medium text-rose-700">{alert.velocityImpact}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{alert.description}</p>
                      <div className="mt-2 text-xs text-slate-500">
                        Correlated: {alert.correlatedPatterns.join(" • ")}
                      </div>
                      <div className="mt-3">
                        <div className="text-xs font-medium text-slate-700">
                          Proposed scenarios:
                        </div>
                        <ul className="mt-1 text-xs text-slate-600 list-disc list-inside space-y-0.5">
                          {alert.proposedScenarios.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-3">
                        <Button
                          size="sm"
                          disabled={!isActive || submitted || submittingId === alert.id}
                          onClick={() => queueForApproval(alert.id, alert)}
                        >
                          {submitted
                            ? "Queued"
                            : submittingId === alert.id
                            ? "Submitting…"
                            : "Queue for Approval"}
                        </Button>
                      </div>
                    </div>
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
