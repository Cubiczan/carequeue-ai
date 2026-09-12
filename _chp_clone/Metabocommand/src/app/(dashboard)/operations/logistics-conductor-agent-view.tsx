"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { KpiCard } from "@/components/kpi-card";
import {
  logisticsKpis,
  logisticsCarrierCosts,
  logisticsOnTimeTrend,
  logisticsDelayAlerts,
  logisticsRouteOptimizations,
  type RouteOptimization,
} from "@/lib/dummy-data";
import { formatCurrency, cn } from "@/lib/utils";

export function LogisticsConductorAgentView() {
  const [isActive, setIsActive] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  async function submitRoute(r: RouteOptimization) {
    setSubmittingId(r.id);
    try {
      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "Logistics Conductor Agent",
          queue: "operations",
          action_description: `${r.description} — projected savings ${formatCurrency(r.projectedSavings)}/yr, on-time improvement +${r.onTimeImprovement}%`,
          financial_impact: `-${formatCurrency(r.projectedSavings)}/yr saved`,
          impact_amount: -r.projectedSavings,
        }),
      });
      if (res.ok) setSubmittedIds((prev) => new Set(prev).add(r.id));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Logistics Conductor Agent</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Carrier orchestration, delay detection, and route optimization
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
          <KpiCard label="On-Time Delivery Rate" value={`${logisticsKpis.onTimeDeliveryRate}%`} trend="up" subtext="+0.6% vs prior 30d" />
          <KpiCard label="Delivery Cost / Order" value={`$${logisticsKpis.deliveryCostPerOrder.toFixed(2)}`} trend="down" />
          <KpiCard label="Active Delay Alerts" value={String(logisticsKpis.activeDelayAlerts)} trend="down" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Delivery cost by carrier</h3>
            <div className="rounded-md border border-slate-200 p-4 bg-white">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={logisticsCarrierCosts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="carrier" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip formatter={(v, name) => name === "costPerOrder" ? `$${Number(v).toFixed(2)}/order` : `${v}%`} />
                  <Bar dataKey="costPerOrder" radius={[0, 6, 6, 0]}>
                    {logisticsCarrierCosts.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.onTimeRate >= 95 ? "#10b981" : entry.onTimeRate >= 90 ? "#6366f1" : entry.onTimeRate >= 85 ? "#f59e0b" : "#f43f5e"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                <Legend color="#10b981" label="On-time ≥95%" />
                <Legend color="#6366f1" label="≥90%" />
                <Legend color="#f59e0b" label="≥85%" />
                <Legend color="#f43f5e" label="<85%" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">On-time delivery trend</h3>
            <div className="rounded-md border border-slate-200 p-4 bg-white">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={logisticsOnTimeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[85, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Active delay alerts</h3>
          <div className="space-y-3">
            {logisticsDelayAlerts.map((d) => (
              <div key={d.id} className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{d.carrier}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-600">{d.route}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs font-mono font-semibold text-rose-700">{d.affectedOrders} orders</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-700"><span className="font-medium">Cause:</span> {d.cause}</div>
                    <div className="mt-1 text-sm text-slate-700"><span className="font-medium">Proposed action:</span> {d.proposedAction}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Route optimization proposals</h3>
          <div className="space-y-3">
            {logisticsRouteOptimizations.map((r) => {
              const submitted = submittedIds.has(r.id);
              return (
                <div key={r.id} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-900 font-medium">{r.description}</div>
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">Projected savings</span>{" "}
                          <span className="font-mono font-semibold text-emerald-700">{formatCurrency(r.projectedSavings)}/yr</span>
                        </div>
                        {r.onTimeImprovement > 0 && (
                          <div>
                            <span className="text-slate-500">On-time improvement</span>{" "}
                            <span className="font-mono font-semibold text-emerald-700">+{r.onTimeImprovement}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!isActive || submitted || submittingId === r.id}
                      onClick={() => submitRoute(r)}
                    >
                      {submitted ? "Queued" : submittingId === r.id ? "Submitting…" : "Submit for Approval"}
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
