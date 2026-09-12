import { Wifi, WifiOff, Clock, Blocks, Zap, Loader2 } from "lucide-react";
import { useLiquifyMetrics } from "@/hooks/useLiquifyNetwork";

const NetworkStatus = () => {
  const { data, isLoading, isError } = useLiquifyMetrics();

  const metrics = [
    {
      icon: isError ? WifiOff : Wifi,
      label: "Network",
      value: isLoading ? "Connecting…" : isError ? "Disconnected" : "BNB Mainnet",
      color: isError ? "text-destructive" : "text-success",
    },
    {
      icon: Clock,
      label: "Block Time",
      value: "~3s",
      color: "text-primary",
    },
    {
      icon: Blocks,
      label: "Block Height",
      value: isLoading ? "Loading…" : data ? `#${data.blockHeight.toLocaleString()}` : "—",
      color: "text-foreground",
    },
    {
      icon: Zap,
      label: "Bond Rate",
      value: isLoading ? "…" : data ? `${data.networkBondRate}%` : "—",
      color: "text-accent",
    },
  ];

  return (
    <div className="glass-panel p-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        BNB Chain Network
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

export default NetworkStatus;
