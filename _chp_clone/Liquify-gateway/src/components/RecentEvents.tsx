import { ArrowDownToLine, ArrowUpFromLine, Coins, ArrowLeftRight, ShieldAlert, TriangleAlert } from "lucide-react";
import { MOCK_STAKING_EVENTS } from "@/lib/liquify";

const iconMap = {
  stake: ArrowDownToLine,
  unstake: ArrowUpFromLine,
  claim_reward: Coins,
  redelegate: ArrowLeftRight,
  validator_jailed: ShieldAlert,
  slash_event: TriangleAlert,
};

const colorMap = {
  stake: "text-success",
  unstake: "text-warning",
  claim_reward: "text-primary",
  redelegate: "text-accent",
  validator_jailed: "text-destructive",
  slash_event: "text-destructive",
};

const RecentEvents = () => {
  const events = MOCK_STAKING_EVENTS;

  return (
    <div className="glass-panel p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        On-Chain Events
      </h2>

      <div className="space-y-1">
        {events.slice(0, 6).map((event, i) => {
          const Icon = iconMap[event.type];
          return (
            <div
              key={event.id}
              className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
            >
              <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                <Icon className={`w-3.5 h-3.5 ${colorMap[event.type]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{event.detail}</p>
                <p className="text-[10px] text-muted-foreground">{event.validator}</p>
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
