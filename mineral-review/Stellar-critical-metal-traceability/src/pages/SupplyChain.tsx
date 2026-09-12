import { Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SupplyChainFlow from "@/components/SupplyChainFlow";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const transformations = [
  { id: "TF-001", input: "LiORE (10,000)", output: "LiREF (2,500)", entity: "Albemarle Corp", contract: "transform_token()", timestamp: "2026-03-29 12:08", status: "verified" },
  { id: "TF-002", input: "LiREF (2,500)", output: "CAM (800)", entity: "BASF Battery", contract: "transform_token()", timestamp: "2026-03-28 18:45", status: "verified" },
  { id: "TF-003", input: "CAM (800)", output: "CATH (400)", entity: "Umicore US", contract: "transform_token()", timestamp: "2026-03-28 09:30", status: "pending" },
  { id: "TF-004", input: "CATH (400)", output: "CELL (200)", entity: "Panasonic Energy", contract: "assemble_token()", timestamp: "2026-03-27 15:12", status: "verified" },
];

const SupplyChain = () => (
  <div className="px-6 py-6 space-y-6">
    <div className="flex items-center gap-3">
      <Network className="w-5 h-5 text-primary" />
      <h1 className="text-xl font-semibold text-foreground">Supply Chain</h1>
      <Badge variant="stellar" className="text-[10px] font-mono">Soroban Verified</Badge>
    </div>

    <Tabs defaultValue="provenance" className="w-full">
      <TabsList>
        <TabsTrigger value="provenance">Provenance Graph</TabsTrigger>
        <TabsTrigger value="transformations">Transformations</TabsTrigger>
        <TabsTrigger value="audit">Audit Trail</TabsTrigger>
      </TabsList>

      <TabsContent value="provenance">
        <SupplyChainFlow />
      </TabsContent>

      <TabsContent value="transformations">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Input</TableHead>
                <TableHead>Output</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transformations.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs text-primary/80">{t.id}</TableCell>
                  <TableCell className="text-xs">{t.input}</TableCell>
                  <TableCell className="text-xs">{t.output}</TableCell>
                  <TableCell className="text-sm">{t.entity}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.contract}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.timestamp}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "verified" ? "compliant" : "review"} className="text-[10px]">
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
          <p className="text-xs text-muted-foreground">Immutable audit trail from Soroban contract events</p>
          {[
            { event: "token_minted", detail: "LiORE 10,000 by Piedmont Lithium", ledger: "#56,234,891", time: "2026-03-29 14:22" },
            { event: "token_transferred", detail: "LiORE 10,000 → Albemarle Corp", ledger: "#56,234,920", time: "2026-03-29 14:25" },
            { event: "token_transformed", detail: "LiORE → LiREF (2,500 units)", ledger: "#56,235,012", time: "2026-03-29 12:08" },
            { event: "compliance_check", detail: "Umicore US flagged for review", ledger: "#56,235,100", time: "2026-03-28 09:30" },
          ].map((e, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-primary">{e.event}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{e.ledger}</span>
                </div>
                <p className="text-xs text-foreground mt-0.5">{e.detail}</p>
                <span className="text-[10px] text-muted-foreground">{e.time}</span>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  </div>
);

export default SupplyChain;
