import { Gem, ArrowUpDown, Send, Flame, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Asset {
  tokenId: string;
  name: string;
  symbol: string;
  issuer: string;
  totalSupply: string;
  standard: string;
  status: "active" | "frozen" | "pending";
}

const assets: Asset[] = [
  { tokenId: "SEP41:LiOre:001", name: "Lithium Ore Token", symbol: "LiORE", issuer: "GCXK...7WQD", totalSupply: "500,000", standard: "SEP-41", status: "active" },
  { tokenId: "SEP41:LiRef:042", name: "Refined Li₂CO₃", symbol: "LiREF", issuer: "GBTZ...4HRN", totalSupply: "120,000", standard: "SEP-41", status: "active" },
  { tokenId: "SEP41:CAM:118", name: "CAM Precursor", symbol: "CAM", issuer: "GBNX...2VLE", totalSupply: "45,000", standard: "SEP-41", status: "active" },
  { tokenId: "SEP41:Cath:205", name: "Cathode Batch", symbol: "CATH", issuer: "GBNX...2VLE", totalSupply: "18,000", standard: "SEP-41", status: "pending" },
  { tokenId: "SEP41:Cell:890", name: "Cell Assembly", symbol: "CELL", issuer: "GDWL...9PKM", totalSupply: "8,500", standard: "SEP-41", status: "active" },
  { tokenId: "SEP41:Pack:1201", name: "Battery Pack", symbol: "BPAK", issuer: "GDWL...9PKM", totalSupply: "2,200", standard: "SEP-41", status: "active" },
];

const transfers = [
  { id: "tx-001", from: "GCXK...7WQD", to: "GBTZ...4HRN", asset: "LiORE", amount: "10,000", timestamp: "2026-03-29 14:22", status: "confirmed" },
  { id: "tx-002", from: "GBTZ...4HRN", to: "GBNX...2VLE", asset: "LiREF", amount: "2,500", timestamp: "2026-03-29 12:08", status: "confirmed" },
  { id: "tx-003", from: "GBNX...2VLE", to: "GDWL...9PKM", asset: "CAM", amount: "800", timestamp: "2026-03-28 18:45", status: "pending" },
];

const statusColor = { active: "compliant" as const, frozen: "nonCompliant" as const, pending: "review" as const };

const Assets = () => (
  <div className="px-6 py-6 space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Gem className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Asset Registry</h1>
        <Badge variant="stellar" className="text-[10px] font-mono">{assets.length} SEP-41 Tokens</Badge>
      </div>
      <Button size="sm" className="gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Register Asset
      </Button>
    </div>

    <Tabs defaultValue="registry" className="w-full">
      <TabsList>
        <TabsTrigger value="registry">Token Registry</TabsTrigger>
        <TabsTrigger value="transfers">Transfers</TabsTrigger>
        <TabsTrigger value="actions">Actions</TabsTrigger>
      </TabsList>

      <TabsContent value="registry">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead className="text-right">Supply</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => (
                <TableRow key={a.tokenId}>
                  <TableCell className="font-mono text-xs text-primary/80">{a.tokenId}</TableCell>
                  <TableCell className="font-medium text-sm">{a.name}</TableCell>
                  <TableCell className="font-mono text-xs">{a.symbol}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{a.issuer}</TableCell>
                  <TableCell className="text-right text-sm">{a.totalSupply}</TableCell>
                  <TableCell><Badge variant="stellar" className="text-[10px]">{a.standard}</Badge></TableCell>
                  <TableCell><Badge variant={statusColor[a.status]} className="text-[10px]">{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="transfers">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TX</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs text-primary/80">{t.id}</TableCell>
                  <TableCell className="font-mono text-xs">{t.from}</TableCell>
                  <TableCell className="font-mono text-xs">{t.to}</TableCell>
                  <TableCell className="font-mono text-xs">{t.asset}</TableCell>
                  <TableCell className="text-right text-sm">{t.amount}</TableCell>
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

      <TabsContent value="actions">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Plus, label: "Mint Tokens", desc: "Issue new SEP-41 tokens via Soroban contract" },
            { icon: Send, label: "Transfer", desc: "Send tokens between registered entities" },
            { icon: Flame, label: "Burn / Retire", desc: "Permanently remove tokens from circulation" },
          ].map((action) => (
            <div key={action.label} className="rounded-lg border border-border bg-card p-5 hover:bg-secondary/30 transition-colors cursor-pointer">
              <action.icon className="w-5 h-5 text-primary mb-3" />
              <h3 className="text-sm font-medium text-foreground">{action.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{action.desc}</p>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  </div>
);

export default Assets;
