import { Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import YieldProvenance from "@/components/YieldProvenance";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MOCK_STAKING_EVENTS, MOCK_YIELD_PROVENANCE } from "@/lib/liquify";

const yieldSteps = [
  { id: "YS-001", from: "User BNB", to: "lstBNB Pool", amount: "2,500 BNB", validator: "Liquify Protocol", timestamp: "2026-04-02 09:14", status: "confirmed" },
  { id: "YS-002", from: "lstBNB Pool", to: "BNB48 Club", amount: "2,500 BNB", validator: "BNB48 Club", timestamp: "2026-04-02 09:14", status: "confirmed" },
  { id: "YS-003", from: "BNB48 Club", to: "Consensus Layer", amount: "2,500 BNB", validator: "BNB Chain", timestamp: "2026-04-02 09:15", status: "confirmed" },
  { id: "YS-004", from: "Consensus Layer", to: "Yield Distribution", amount: "12.8 lstBNB", validator: "Liquify Protocol", timestamp: "2026-04-02 12:00", status: "confirmed" },
  { id: "YS-005", from: "Yield Distribution", to: "User Claim", amount: "12.8 lstBNB", validator: "User Wallet", timestamp: "2026-04-02 12:05", status: "claimed" },
];

const SupplyChain = () => (
  <div className="px-6 py-6 space-y-6">
    <div className="flex items-center gap-3">
      <Route className="w-5 h-5 text-primary" />
      <h1 className="text-xl font-semibold text-foreground">Yield Provenance</h1>
      <Badge variant="liquify" className="text-[10px] font-mono">Liquify Indexer</Badge>
    </div>

    <Tabs defaultValue="provenance" className="w-full">
      <TabsList>
        <TabsTrigger value="provenance">Provenance Graph</TabsTrigger>
        <TabsTrigger value="flow">Yield Flow</TabsTrigger>
        <TabsTrigger value="audit">Audit Trail</TabsTrigger>
      </TabsList>

      <TabsContent value="provenance">
        <YieldProvenance />
      </TabsContent>

      <TabsContent value="flow">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Validator</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yieldSteps.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs text-primary/80">{t.id}</TableCell>
                  <TableCell className="text-xs">{t.from}</TableCell>
                  <TableCell className="text-xs">{t.to}</TableCell>
                  <TableCell className="text-xs font-mono">{t.amount}</TableCell>
                  <TableCell className="text-sm">{t.validator}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.timestamp}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "confirmed" ? "compliant" : "review"} className="text-[10px]">
                      {t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="audit">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <p className="text-xs text-muted-foreground">Immutable audit trail from staking events</p>
          {MOCK_STAKING_EVENTS.map((e, i) => (
            <div key={e.id} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-primary">{e.type}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Block #{e.blockNumber.toLocaleString()}</span>
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

export default SupplyChain;
