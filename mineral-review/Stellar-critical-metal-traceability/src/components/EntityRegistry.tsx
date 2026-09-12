import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, KeyRound } from "lucide-react";

interface Entity {
  name: string;
  type: string;
  jurisdiction: string;
  role: string;
  stellarAddress: string;
  credentials: string[];
  status: "active" | "pending";
}

const entities: Entity[] = [
  {
    name: "Piedmont Lithium",
    type: "Miner",
    jurisdiction: "US-NC",
    role: "ROLE_MINER",
    stellarAddress: "GCXK...7WQD",
    credentials: ["Know-Your-Facility", "Domestic Producer"],
    status: "active",
  },
  {
    name: "Albemarle Corp",
    type: "Refiner",
    jurisdiction: "US-NV",
    role: "ROLE_REFINER",
    stellarAddress: "GBTZ...4HRN",
    credentials: ["Export Control Cleared", "Allied Producer"],
    status: "active",
  },
  {
    name: "L3Harris Technologies",
    type: "OEM",
    jurisdiction: "US-FL",
    role: "ROLE_OEM",
    stellarAddress: "GDWL...9PKM",
    credentials: ["CMMC Level 3", "DoD Approved"],
    status: "active",
  },
  {
    name: "Umicore US",
    type: "Converter",
    jurisdiction: "CA-ON",
    role: "ROLE_REFINER",
    stellarAddress: "GBNX...2VLE",
    credentials: ["Allied Producer"],
    status: "pending",
  },
];

const EntityRegistry = () => {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Entity Registry</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Credential & access control registry
          </p>
        </div>
        <Badge variant="stellar" className="text-[10px] font-mono">
          {entities.length} Entities
        </Badge>
      </div>

      <div className="space-y-2">
        {entities.map((entity) => (
          <div
            key={entity.stellarAddress}
            className="rounded-md border border-border/50 bg-secondary/20 p-3 hover:bg-secondary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">{entity.name}</span>
                <span className="text-[10px] text-muted-foreground">({entity.type})</span>
              </div>
              <Badge
                variant={entity.status === "active" ? "compliant" : "review"}
                className="text-[10px]"
              >
                {entity.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{entity.jurisdiction}</span>
              </div>
              <div className="flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-mono text-muted-foreground">
                  {entity.stellarAddress}
                </span>
              </div>
            </div>

            <div className="flex gap-1.5 mt-2 flex-wrap">
              {entity.credentials.map((cred) => (
                <span
                  key={cred}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {cred}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EntityRegistry;
