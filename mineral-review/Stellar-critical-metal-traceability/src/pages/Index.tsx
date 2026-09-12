import StatsGrid from "@/components/StatsGrid";
import SupplyChainFlow from "@/components/SupplyChainFlow";
import CompliancePanel from "@/components/CompliancePanel";
import EntityRegistry from "@/components/EntityRegistry";
import RecentEvents from "@/components/RecentEvents";
import StellarNetworkStatus from "@/components/StellarNetworkStatus";

const Index = () => {
  return (
    <div className="px-6 py-6 space-y-6">
      <StellarNetworkStatus />
      <StatsGrid />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SupplyChainFlow />
        <CompliancePanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentEvents />
        <EntityRegistry />
      </div>
    </div>
  );
};

export default Index;
