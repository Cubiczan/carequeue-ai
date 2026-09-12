import { Badge } from "@/components/ui/badge";
import { MOCK_YIELD_PROVENANCE } from "@/lib/liquify";

const statusConfig = {
  active: { label: "Active", color: "border-success bg-success/30" },
  unbonding: { label: "Unbonding", color: "border-warning bg-warning/30" },
  jailed: { label: "Jailed", color: "border-destructive bg-destructive/30" },
};

const YieldProvenance = () => {
  const nodes = MOCK_YIELD_PROVENANCE;

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Yield Provenance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Asset flow trace — User to Yield Claim
          </p>
        </div>
        <Badge variant="liquify" className="text-[10px] font-mono">
          Liquify Indexer
        </Badge>
      </div>

      <div className="relative">
        {nodes.map((node, i) => {
          const cfg = statusConfig[node.status];
          return (
            <div key={node.id} className="flex items-start gap-4 relative">
              {/* Vertical connector */}
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full border-2 ${cfg.color}`} />
                {i < nodes.length - 1 && (
                  <div className="w-px h-12 bg-border/60" />
                )}
              </div>

              {/* Node content */}
              <div className="flex-1 -mt-1 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{node.label}</span>
                  <Badge
                    variant={node.status === 'active' ? 'compliant' : node.status === 'unbonding' ? 'review' : 'nonCompliant'}
                    className="text-[10px]"
                  >
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">{node.validator}</span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  {node.stakeAmount > 0 && (
                    <span className="text-[10px] text-foreground">
                      Staked: <span className="font-mono text-primary">{node.stakeAmount.toLocaleString()} BNB</span>
                    </span>
                  )}
                  {node.yieldGenerated > 0 && (
                    <span className="text-[10px] text-foreground">
                      Yield: <span className="font-mono text-success">+{node.yieldGenerated} lstBNB</span>
                    </span>
                  )}
                  {node.apr > 0 && (
                    <span className="text-[10px] text-foreground">
                      APR: <span className="font-mono text-accent">{node.apr}%</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-primary/60 mt-0.5 block">
                  {node.txHash}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YieldProvenance;
