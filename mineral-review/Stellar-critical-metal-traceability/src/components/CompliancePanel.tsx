import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, XCircle } from "lucide-react";

interface PolicyResult {
  policyName: string;
  version: string;
  domesticPct: number;
  alliedPct: number;
  status: "compliant" | "review" | "nonCompliant";
  attestationHash: string;
}

const policies: PolicyResult[] = [
  {
    policyName: "US-Domestic-Content-2026-v1",
    version: "v1.2",
    domesticPct: 78,
    alliedPct: 94,
    status: "compliant",
    attestationHash: "0xabc...f42d",
  },
  {
    policyName: "Defense-Enhanced-Domestic-v1",
    version: "v1.0",
    domesticPct: 62,
    alliedPct: 88,
    status: "review",
    attestationHash: "0x7e2...91ba",
  },
  {
    policyName: "FEOC-Exclusion-2026",
    version: "v2.1",
    domesticPct: 78,
    alliedPct: 94,
    status: "compliant",
    attestationHash: "0xd1f...c803",
  },
];

const statusConfig = {
  compliant: { icon: ShieldCheck, label: "Pass", variant: "compliant" as const },
  review: { icon: AlertTriangle, label: "Review", variant: "review" as const },
  nonCompliant: { icon: XCircle, label: "Fail", variant: "nonCompliant" as const },
};

const CompliancePanel = () => {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Policy Compliance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Asset: Battery Pack #1201
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {policies.map((policy) => {
          const config = statusConfig[policy.status];
          const Icon = config.icon;
          return (
            <div
              key={policy.policyName}
              className="rounded-md border border-border/50 bg-secondary/30 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${
                    policy.status === "compliant" ? "text-success" :
                    policy.status === "review" ? "text-warning" : "text-destructive"
                  }`} />
                  <span className="text-xs font-medium text-foreground">
                    {policy.policyName}
                  </span>
                </div>
                <Badge variant={config.variant} className="text-[10px]">
                  {config.label}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    Domestic Content
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${policy.domesticPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-foreground">
                      {policy.domesticPct}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    Allied Origin
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${policy.alliedPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-foreground">
                      {policy.alliedPct}%
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] font-mono text-muted-foreground mt-2">
                Attestation: {policy.attestationHash}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompliancePanel;
