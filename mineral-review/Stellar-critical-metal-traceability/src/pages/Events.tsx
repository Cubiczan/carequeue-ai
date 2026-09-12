import { Activity, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type EventType = "token_minted" | "token_transferred" | "token_transformed" | "compliance_check" | "entity_registered" | "policy_enforced";

interface SorobanEvent {
  id: string;
  type: EventType;
  detail: string;
  entity: string;
  ledger: string;
  contract: string;
  timestamp: string;
}

const events: SorobanEvent[] = [
  { id: "EVT-001", type: "token_minted", detail: "LiORE 10,000 minted", entity: "Piedmont Lithium", ledger: "#56,234,891", contract: "mint()", timestamp: "2026-03-29 14:22" },
  { id: "EVT-002", type: "token_transferred", detail: "LiORE 10,000 → Albemarle Corp", entity: "Piedmont Lithium", ledger: "#56,234,920", contract: "transfer()", timestamp: "2026-03-29 14:25" },
  { id: "EVT-003", type: "token_transformed", detail: "LiORE → LiREF (2,500 units)", entity: "Albemarle Corp", ledger: "#56,235,012", contract: "transform_token()", timestamp: "2026-03-29 12:08" },
  { id: "EVT-004", type: "compliance_check", detail: "Umicore US flagged — Allied Nation review", entity: "Umicore US", ledger: "#56,235,100", contract: "check_compliance()", timestamp: "2026-03-28 09:30" },
  { id: "EVT-005", type: "entity_registered", detail: "Panasonic Energy registered as OEM", entity: "Panasonic Energy", ledger: "#56,235,150", contract: "register_entity()", timestamp: "2026-03-27 16:40" },
  { id: "EVT-006", type: "token_transformed", detail: "CAM → CATH (400 units)", entity: "Umicore US", ledger: "#56,235,200", contract: "transform_token()", timestamp: "2026-03-27 11:15" },
  { id: "EVT-007", type: "policy_enforced", detail: "Export Control block on transfer TX-099", entity: "System", ledger: "#56,235,300", contract: "enforce_policy()", timestamp: "2026-03-26 08:50" },
  { id: "EVT-008", type: "token_minted", detail: "CELL 200 minted", entity: "Panasonic Energy", ledger: "#56,235,400", contract: "mint()", timestamp: "2026-03-25 13:00" },
];

const typeColor: Record<EventType, "compliant" | "review" | "stellar" | "nonCompliant"> = {
  token_minted: "compliant",
  token_transferred: "stellar",
  token_transformed: "stellar",
  compliance_check: "review",
  entity_registered: "compliant",
  policy_enforced: "nonCompliant",
};

const transactions = [
  { hash: "a3f2...8c1d", type: "InvokeHostFunction", status: "SUCCESS", fee: "0.00012 XLM", ledger: "#56,234,891", time: "2026-03-29 14:22" },
  { hash: "b7e1...4a9f", type: "InvokeHostFunction", status: "SUCCESS", fee: "0.00015 XLM", ledger: "#56,234,920", time: "2026-03-29 14:25" },
  { hash: "c9d4...2b3e", type: "InvokeHostFunction", status: "SUCCESS", fee: "0.00018 XLM", ledger: "#56,235,012", time: "2026-03-29 12:08" },
  { hash: "d1f8...7e6c", type: "InvokeHostFunction", status: "FAILED", fee: "0.00010 XLM", ledger: "#56,235,100", time: "2026-03-28 09:30" },
  { hash: "e5a2...9d0b", type: "InvokeHostFunction", status: "SUCCESS", fee: "0.00014 XLM", ledger: "#56,235,150", time: "2026-03-27 16:40" },
];

const Events = () => (
  <div className="px-6 py-6 space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Activity className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Event Log</h1>
        <Badge variant="stellar" className="text-[10px] font-mono">{events.length} Events</Badge>
      </div>
      <Button variant="outline" size="sm" className="gap-1.5">
        <Filter className="w-3.5 h-3.5" /> Filter
      </Button>
    </div>

    <Tabs defaultValue="events" className="w-full">
      <TabsList>
        <TabsTrigger value="events">Contract Events</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="live">Live Feed</TabsTrigger>
      </TabsList>

      <TabsContent value="events">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Ledger</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs text-primary/80">{e.id}</TableCell>
                  <TableCell>
                    <Badge variant={typeColor[e.type]} className="text-[10px] font-mono">{e.type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{e.detail}</TableCell>
                  <TableCell className="text-sm">{e.entity}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.contract}</TableCell>
                  <TableCell className="font-mono text-xs text-primary/70">{e.ledger}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="transactions">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hash</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Ledger</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.hash}>
                  <TableCell className="font-mono text-xs text-primary/80">{t.hash}</TableCell>
                  <TableCell className="text-xs">{t.type}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "SUCCESS" ? "compliant" : "nonCompliant"} className="text-[10px]">
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.fee}</TableCell>
                  <TableCell className="font-mono text-xs text-primary/70">{t.ledger}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="live">
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Listening to Soroban contract events on Mainnet</span>
          </div>
          {events.slice(0, 5).map((e, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-primary">{e.type}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{e.ledger}</span>
                </div>
                <p className="text-xs text-foreground mt-0.5">{e.detail}</p>
                <span className="text-[10px] text-muted-foreground">{e.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  </div>
);

export default Events;
