import { ArrowRight, Flame, Package, Truck } from "lucide-react";

interface ChainEvent {
  type: "mint" | "transfer" | "burn" | "transform";
  description: string;
  entity: string;
  timestamp: string;
  txHash: string;
}

const events: ChainEvent[] = [
  { type: "mint", description: "Minted LiOre lot #1047", entity: "Piedmont Lithium", timestamp: "2 min ago", txHash: "tx:abc...12f" },
  { type: "transfer", description: "Li₂CO₃ → BASF Battery", entity: "Albemarle Corp", timestamp: "18 min ago", txHash: "tx:d4e...89a" },
  { type: "transform", description: "CAM → Cathode (burn 3, mint 1)", entity: "Umicore US", timestamp: "1 hr ago", txHash: "tx:f72...3cd" },
  { type: "transfer", description: "Cell batch → L3Harris", entity: "Panasonic Energy", timestamp: "3 hr ago", txHash: "tx:91b...e07" },
  { type: "mint", description: "Battery Pack #1201 finalized", entity: "L3Harris", timestamp: "4 hr ago", txHash: "tx:c3d...41f" },
  { type: "burn", description: "Recycled defective cells (lot #882)", entity: "Li-Cycle", timestamp: "6 hr ago", txHash: "tx:a8f...72e" },
];

const iconMap = {
  mint: Package,
  transfer: Truck,
  burn: Flame,
  transform: ArrowRight,
};

const colorMap = {
  mint: "text-success",
  transfer: "text-primary",
  burn: "text-destructive",
  transform: "text-accent",
};

const RecentEvents = () => {
  return (
    <div className="glass-panel p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        On-Chain Events
      </h2>

      <div className="space-y-1">
        {events.map((event, i) => {
          const Icon = iconMap[event.type];
          return (
            <div
              key={i}
              className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
            >
              <div className={`w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${colorMap[event.type]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{event.description}</p>
                <p className="text-[10px] text-muted-foreground">{event.entity}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground">{event.timestamp}</p>
                <p className="text-[10px] font-mono text-primary/50">{event.txHash}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentEvents;
