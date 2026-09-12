import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/kpi-card";
import { PulseAgentView } from "./pulse-agent-view";
import { OracleAgentView } from "./oracle-agent-view";
import { SniperAgentView } from "./sniper-agent-view";
import { ConductorAgentView } from "./conductor-agent-view";
import { financeHeaderKpis } from "@/lib/dummy-data";
import { formatCurrency } from "@/lib/utils";

export default async function FinanceDashboardPage() {
  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from("approval_items")
    .select("*", { count: "exact", head: true })
    .eq("queue", "finance")
    .eq("status", "pending");

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Capital Reflex System</h1>
          <p className="text-sm text-slate-500 mt-1">Last 30 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Capital Deployed"
          value={formatCurrency(financeHeaderKpis.totalCapitalDeployed)}
        />
        <KpiCard
          label="Net Capital Velocity Score"
          value={financeHeaderKpis.netCapitalVelocityScore.toFixed(2)}
          trend="up"
          subtext="+0.12 vs prior 30d"
        />
        <KpiCard
          label="Active Anomalies"
          value={String(financeHeaderKpis.activeAnomalies)}
          trend="down"
          subtext="Requires review"
        />
        <KpiCard
          label="Pending Approvals"
          value={String(pendingCount ?? 0)}
          trend="neutral"
        />
      </div>

      <PulseAgentView />
      <OracleAgentView />
      <SniperAgentView />
      <ConductorAgentView />
    </div>
  );
}
