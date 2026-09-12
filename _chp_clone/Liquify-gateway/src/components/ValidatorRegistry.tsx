import { Badge } from "@/components/ui/badge";
import { Server, Blocks, Wallet } from "lucide-react";
import { MOCK_VALIDATORS } from "@/lib/liquify";

const ValidatorRegistry = () => {
  const validators = MOCK_VALIDATORS.slice(0, 4);

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Validator Registry</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Top validators by delegation
          </p>
        </div>
        <Badge variant="liquify" className="text-[10px] font-mono">
          {MOCK_VALIDATORS.length} Validators
        </Badge>
      </div>

      <div className="space-y-2">
        {validators.map((val) => (
          <div
            key={val.id}
            className="rounded-md border border-border/50 bg-secondary/20 p-3 hover:bg-secondary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">{val.name}</span>
                <Badge
                  variant={val.status === "active" ? "compliant" : "nonCompliant"}
                  className="text-[10px]"
                >
                  {val.status}
                </Badge>
              </div>
              <Badge variant="liquify" className="text-[10px] font-mono">
                {val.apr}% APR
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <Blocks className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{val.operatorAddress}</span>
              </div>
              <div className="flex items-center gap-1">
                <Wallet className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{val.delegators.toLocaleString()} delegators</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-muted-foreground">
                Stake: <span className="font-mono text-foreground">{val.activeStake.toLocaleString()} BNB</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                Commission: <span className="font-mono text-foreground">{val.commission}%</span>
              </span>
            </div>

            <div className="flex gap-1.5 mt-2 flex-wrap">
              {val.uptime >= 99.95 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">100% Uptime</span>
              )}
              {val.commission <= 5 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Low Commission</span>
              )}
              {val.activeStake >= 200000 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Top 10</span>
              )}
              {val.selfBond >= 20000 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">High Self-Bond</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValidatorRegistry;
