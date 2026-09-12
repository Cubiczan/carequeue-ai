"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import {
  advocacyKpis,
  advocacyReviewTrend,
  advocacyReferralFunnel,
  advocacySegments,
} from "@/lib/dummy-data-lifetime";
import { cn } from "@/lib/utils";

export function AdvocacyAgentView() {
  const [isActive, setIsActive] = useState(true);

  const maxFunnelCount = Math.max(...advocacyReferralFunnel.map((s) => s.count));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Advocacy Agent</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Review amplification and referral program orchestration
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
            label="Review Volume (30d)"
            value={advocacyKpis.reviewVolume30d.toLocaleString()}
            trend="up"
            subtext="+18% vs prior 30d"
          />
          <KpiCard
            label="Referral Rate"
            value={`${advocacyKpis.referralRate}%`}
            trend="up"
          />
          <KpiCard
            label="Organic from Referrals"
            value={advocacyKpis.organicAcquisitionFromReferrals.toLocaleString()}
            subtext="New customers (30d)"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Review volume trend</h3>
            <div className="rounded-md border border-slate-200 p-4 bg-white">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={advocacyReviewTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${Number(v).toLocaleString()} reviews`} />
                  <Bar dataKey="volume" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Referral funnel</h3>
            <div className="rounded-md border border-slate-200 p-4 bg-white space-y-2">
              {advocacyReferralFunnel.map((step, i) => {
                const pct = (step.count / maxFunnelCount) * 100;
                const prev = i > 0 ? advocacyReferralFunnel[i - 1].count : step.count;
                const conv = i > 0 ? ((step.count / prev) * 100).toFixed(1) : null;
                return (
                  <div key={step.step} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium text-slate-700">{step.step}</div>
                    <div className="flex-1 relative h-7 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-end pr-2"
                        style={{ width: `${pct}%` }}
                      >
                        <span className="text-xs font-semibold text-white font-mono">
                          {step.count.toLocaleString()}
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
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            High-advocacy customer segments
          </h3>
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Segment</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Size</th>
                  <th className="text-right text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Advocacy Score</th>
                  <th className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider px-4 py-2.5">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {advocacySegments.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.segment}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{s.size.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <AdvocacyScorePill value={s.advocacyScore} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.recommendedAction === "Loyalty program invite" ? "approved" : s.recommendedAction === "Referral incentive" ? "reviewing" : "pending"}>
                        {s.recommendedAction}
                      </Badge>
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

function AdvocacyScorePill({ value }: { value: number }) {
  const color =
    value >= 85 ? "bg-emerald-100 text-emerald-800"
    : value >= 75 ? "bg-indigo-100 text-indigo-800"
    : value >= 60 ? "bg-amber-100 text-amber-800"
    : "bg-slate-100 text-slate-700";
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium font-mono", color)}>
      {value}
    </span>
  );
}
