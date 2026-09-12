import { Wifi, WifiOff, Clock, Database, Zap, Loader2 } from "lucide-react";
import { useStellarLedger } from "@/hooks/useStellarNetwork";

const StellarNetworkStatus = () => {
  const { data, isLoading, isError } = useStellarLedger();

  const metrics = [
    {
      icon: isError ? WifiOff : Wifi,
      label: "Network",
      value: isLoading ? "Connecting…" : isError ? "Disconnected" : "Mainnet",
      color: isError ? "text-destructive" : "text-success",
    },
    {
      icon: Clock,
      label: "Avg Finality",
      value: "~5s",
      color: "text-primary",
    },
    {
      icon: Database,
      label: "Ledger",
      value: isLoading
        ? "Loading…"
        : data
        ? `#${data.sequence.toLocaleString()}`
        : "—",
      color: "text-foreground",
    },
    {
      icon: Zap,
      label: "Protocol",
      value: isLoading
        ? "…"
        : data
        ? `v${data.protocolVersion}`
        : "—",
      color: "text-accent",
    },
  ];

  return (
    <div className="glass-panel p-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Stellar Network
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center gap-2">
            {isLoading && m.label === "Network" ? (
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            ) : (
              <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
            )}
            <div>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
              <p className={`text-xs font-mono font-medium ${m.color}`}>
                {m.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StellarNetworkStatus;
