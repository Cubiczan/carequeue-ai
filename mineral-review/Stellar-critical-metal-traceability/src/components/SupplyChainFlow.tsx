import { Badge } from "@/components/ui/badge";

interface FlowNode {
  id: string;
  label: string;
  entity: string;
  jurisdiction: string;
  status: "compliant" | "review" | "nonCompliant";
  tokenId: string;
}

const nodes: FlowNode[] = [
  { id: "1", label: "Lithium Ore", entity: "Piedmont Lithium", jurisdiction: "US-NC", status: "compliant", tokenId: "SEP41:LiOre:001" },
  { id: "2", label: "Li₂CO₃ Refined", entity: "Albemarle Corp", jurisdiction: "US-NV", status: "compliant", tokenId: "SEP41:LiRef:042" },
  { id: "3", label: "CAM Precursor", entity: "BASF Battery", jurisdiction: "US-MI", status: "compliant", tokenId: "SEP41:CAM:118" },
  { id: "4", label: "Cathode Batch", entity: "Umicore US", jurisdiction: "CA-ON", status: "review", tokenId: "SEP41:Cath:205" },
  { id: "5", label: "Cell Assembly", entity: "Panasonic Energy", jurisdiction: "US-KS", status: "compliant", tokenId: "SEP41:Cell:890" },
  { id: "6", label: "Battery Pack", entity: "L3Harris", jurisdiction: "US-FL", status: "compliant", tokenId: "SEP41:Pack:1201" },
];

const statusLabel = {
  compliant: "Compliant",
  review: "Review",
  nonCompliant: "Non-Compliant",
};

const SupplyChainFlow = () => {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Supply Chain Provenance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Asset graph trace — Mine to Battery Pack
          </p>
        </div>
        <Badge variant="stellar" className="text-[10px] font-mono">
          Soroban Contract
        </Badge>
      </div>

      <div className="relative">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex items-start gap-4 relative">
            {/* Vertical connector */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full border-2 ${
                node.status === "compliant"
                  ? "border-success bg-success/30"
                  : node.status === "review"
                  ? "border-warning bg-warning/30"
                  : "border-destructive bg-destructive/30"
              }`} />
              {i < nodes.length - 1 && (
                <div className="w-px h-12 bg-border/60" />
              )}
            </div>

            {/* Node content */}
            <div className="flex-1 -mt-1 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{node.label}</span>
                <Badge variant={node.status} className="text-[10px]">
                  {statusLabel[node.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">{node.entity}</span>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground">{node.jurisdiction}</span>
              </div>
              <span className="text-[10px] font-mono text-primary/60 mt-0.5 block">
                {node.tokenId}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplyChainFlow;
