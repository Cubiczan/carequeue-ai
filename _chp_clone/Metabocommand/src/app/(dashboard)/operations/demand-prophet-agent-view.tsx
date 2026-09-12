"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { KpiCard } from "@/components/kpi-card";
import {
  demandProphetKpis,
  demandProphetForecast,
  demandProphetStockoutHeatmap,
  demandProphetPoProposals,
  type PurchaseOrderProposal,
} from "@/lib/dummy-data";
import { formatCurrency, cn } from "@/lib/utils";

export function DemandProphetAgentView() {
  const [isActive, setIsActive] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [autoExecutedIds, setAutoExecutedIds] = useState<Set<string>>(new Set());

  async function submitPo(p: PurchaseOrderProposal) {
    setSubmittingId(p.id);
    try {
      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "Demand Prophet Agent",
          queue: "operations",
          action_description: `Issue PO to ${p.vendor}: ${p.quantity.toLocaleString()} units ${p.sku} (${p.productName}) — ${p.triggerReason}, estimated cost ${formatCurrency(p.estimatedCost)}`,
          financial_impact: `${formatCurrency(p.estimatedCost)} PO commitment`,
          impact_amount: p.estimatedCost,
        }),
      });
      if (res.ok) setSubmittedIds((prev) => new Set(prev).add(p.id));
    } finally {
      setSubmittingId(null);
    }
  }

  function autoExecute(p: PurchaseOrderProposal) {
    setAutoExecutedIds((prev) => new Set(prev).add(p.id));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Demand Prophet Agent</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            SKU-level forecasting with auto-purchase orders within threshold
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
          <KpiCard label="Forecast Accuracy" value={`${demandProphetKpis.forecastAccuracy}%`} trend="up" subtext="+1.4% vs prior 30d" />
          <KpiCard label="Active Stockout Risks" value={String(demandProphetKpis.activeStockoutRisks)} trend="down" subtext="Within 14-day window" />
          <KpiCard label="Avg Holding Cost / Unit" value={`$${demandProphetKpis.avgHoldingCostPerUnit.toFixed(2)}`} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            SKU-0091 demand forecast — next 60 days (18% confidence band)
          </h3>
          <div className="rounded-md border border-slate-200 p-4 bg-white">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={demandProphetForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => `D${v}`} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="upper" stroke="transparent" fill="#6366f1" fillOpacity={0.12} />
                <Area type="monotone" dataKey="lower" stroke="transparent" fill="#ffffff" fillOpacity={1} />
                <Line type="monotone" dataKey="demand" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Stockout risk by location × week
          </h3>
          <div className="rounded-md border border-slate-200 bg-white p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 pb-2 pr-3">Location</th>
                  {demandProphetStockoutHeatmap.weeks.map((w) => (
                    <th key={w} className="text-xs font-medium text-slate-500 pb-2 px-2 text-center">{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {demandProphetStockoutHeatmap.locations.map((loc, i) => (
                  <tr key={loc}>
                    <td className="py-2 pr-3 font-medium text-slate-700">{loc}</td>
                    {demandProphetStockoutHeatmap.grid[i].map((risk, j) => (
                      <td key={j} className="p-1 text-center">
                        <div
                          className="rounded px-2 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: risk >= 50
                              ? `hsl(0, 80%, ${95 - risk * 0.4}%)`
                              : risk >= 25
                              ? `hsl(40, 85%, ${95 - risk * 0.5}%)`
                              : `hsl(150, 60%, ${95 - risk * 0.3}%)`,
                            color: risk >= 50 ? "#7f1d1d" : risk >= 25 ? "#78350f" : "#065f46",
                          }}
                        >
                          {risk}%
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
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Auto-generated purchase orders</h3>
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">SKU</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Vendor</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Qty</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Est. Cost</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Trigger</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {demandProphetPoProposals.map((p) => {
                  const submitted = submittedIds.has(p.id);
                  const executed = autoExecutedIds.has(p.id);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div>{p.sku}</div>
                        <div className="text-xs text-slate-500">{p.productName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{p.vendor}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">{p.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900">{formatCurrency(p.estimatedCost)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{p.triggerReason}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {p.autoExecute ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!isActive || executed}
                            onClick={() => autoExecute(p)}
                          >
                            <Zap className="h-3.5 w-3.5" />
                            {executed ? "Executed" : "Auto-Execute"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!isActive || submitted || submittingId === p.id}
                            onClick={() => submitPo(p)}
                          >
                            {submitted ? "Queued" : submittingId === p.id ? "Submitting…" : "Submit for Approval"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            POs under $10,000 auto-execute within threshold; larger POs require Ops Lead approval.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
