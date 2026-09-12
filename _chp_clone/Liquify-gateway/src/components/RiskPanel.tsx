import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, XCircle } from "lucide-react";
import { MOCK_RISK_ASSESSMENTS, MOCK_VALIDATORS } from "@/lib/liquify";

const statusConfig = {
  healthy: { icon: ShieldCheck, label: "Healthy", variant: "compliant" as const },
  warning: { icon: AlertTriangle, label: "Warning", variant: "review" as const },
  critical: { icon: XCircle, label: "Critical", variant: "nonCompliant" as const },
};

const RiskPanel = () => {
  // Show 3 representative risk items: healthy, warning, critical
  const displayRisks = MOCK_RISK_ASSESSMENTS.filter((r) =>
    ["healthy", "warning", "critical"].includes(r.status)
  );

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Validator Risk Assessment</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time slashing and health monitoring
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {displayRisks.map((risk) => {
          const config = statusConfig[risk.status];
          const Icon = config.icon;
          const validator = MOCK_VALIDATORS.find((v) => v.id === risk.validatorId);
          return (
            <div
              key={risk.validatorId}
              className="rounded-md border border-border/50 bg-secondary/30 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${
                    risk.status === "healthy" ? "text-success" :
                    risk.status === "warning" ? "text-warning" : "text-destructive"
                  }`} />
                  <span className="text-xs font-medium text-foreground">
                    {validator?.name || risk.validatorId}
                  </span>
                </div>
                <Badge variant={config.variant} className="text-[10px]">
                  {config.label}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    Risk Score
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          risk.riskScore < 20 ? 'bg-success' :
                          risk.riskScore < 50 ? 'bg-warning' : 'bg-destructive'
                        }`}
                        style={{ width: `${risk.riskScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-foreground">
                      {risk.riskScore}/100
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    Uptime (24h)
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(0, 100 - (risk.downtime24h / 14.4))}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-foreground">
                      {risk.missedBlocks24h} missed
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] text-muted-foreground">
                  Slashing History: <span className="font-mono text-foreground">{risk.slashingHistory}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Commission Change: <span className={`font-mono ${risk.commissionChange30d ? 'text-warning' : 'text-success'}`}>{risk.commissionChange30d ? 'Yes' : 'No'}</span>
                </span>
              </div>

              <p className="text-[10px] font-mono text-muted-foreground mt-2">
                Indexer Reference: 0xabc...{risk.validatorId.slice(-4)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskPanel;
