import StatsGrid from "@/components/StatsGrid";
import YieldProvenance from "@/components/YieldProvenance";
import RiskPanel from "@/components/RiskPanel";
import ValidatorRegistry from "@/components/ValidatorRegistry";
import RecentEvents from "@/components/RecentEvents";
import NetworkStatus from "@/components/NetworkStatus";

const Index = () => {
  return (
    <div className="px-6 py-6 space-y-6">
      <NetworkStatus />
      <StatsGrid />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <YieldProvenance />
        <RiskPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentEvents />
        <ValidatorRegistry />
      </div>
    </div>
  );
};

export default Index;
