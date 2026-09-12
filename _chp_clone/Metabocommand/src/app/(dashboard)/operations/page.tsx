import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/kpi-card";
import { AcquisitionAgentView } from "./acquisition-agent-view";
import { ConversionAgentView } from "./conversion-agent-view";
import { RetentionAgentView } from "./retention-agent-view";
import { DemandProphetAgentView } from "./demand-prophet-agent-view";
import { LogisticsConductorAgentView } from "./logistics-conductor-agent-view";
import { SupportReflexAgentView } from "./support-reflex-agent-view";
import { AdvocacyAgentView } from "./advocacy-agent-view";
import { HarmonyAgentView } from "./harmony-agent-view";
import { operationsHeaderKpis } from "@/lib/dummy-data";
import type { OperatingMode } from "@/lib/dummy-data-lifetime";

export default async function OperationsDashboardPage() {
  const supabase = await createClient();

  const [pendingApprovalsResult, operatingModeResult] = await Promise.all([
    supabase
      .from("approval_items")
      .select("*", { count: "exact", head: true })
      .eq("queue", "operations")
      .eq("status", "pending"),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "operating_mode")
      .single(),
  ]);

  const pendingCount = pendingApprovalsResult.count ?? 0;
  const initialMode: OperatingMode =
    operatingModeResult.data?.value === "growth" ? "growth" : "efficiency";

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Operations Command Center</h1>
        <p className="text-sm text-slate-500 mt-1">Last 30 days</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Conversion Rate"
          value={`${operationsHeaderKpis.conversionRate}%`}
          trend="up"
          subtext="+0.3% vs prior 30d"
        />
        <KpiCard
          label="Stockout Rate"
          value={`${operationsHeaderKpis.stockoutRate}%`}
          trend="down"
          subtext="-0.4% vs prior 30d"
        />
        <KpiCard
          label="Customer LTV (avg)"
          value={`$${operationsHeaderKpis.customerLtvAvg}`}
          trend="up"
          subtext="+4.8% YoY"
        />
        <KpiCard
          label="Support Resolution (avg)"
          value={`${operationsHeaderKpis.supportResolutionTimeAvg}h`}
          trend="down"
          subtext="-1.2h vs prior 30d"
        />
        <KpiCard
          label="Pending Approvals"
          value={String(pendingCount)}
          trend="neutral"
        />
      </div>

      <SectionHeader title="Revenue Velocity" description="Acquisition, Conversion, and Retention agents" />
      <AcquisitionAgentView />
      <ConversionAgentView />
      <RetentionAgentView />

      <SectionHeader title="Inventory Intelligence" description="Demand forecasting and logistics orchestration" />
      <DemandProphetAgentView />
      <LogisticsConductorAgentView />

      <SectionHeader title="Customer Lifetime" description="Support automation and advocacy amplification" />
      <SupportReflexAgentView />
      <AdvocacyAgentView />

      <SectionHeader title="Operational Health" description="Cross-agent harmony and system-wide coordination" />
      <HarmonyAgentView initialMode={initialMode} />
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-t border-slate-200 pt-6 mt-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-0.5">{description}</p>
    </div>
  );
}
