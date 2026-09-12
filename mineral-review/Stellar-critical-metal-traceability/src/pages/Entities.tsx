import { Building2, MapPin, KeyRound, Plus, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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
  { name: "Piedmont Lithium", type: "Miner", jurisdiction: "US-NC", role: "ROLE_MINER", stellarAddress: "GCXK...7WQD", credentials: ["Know-Your-Facility", "Domestic Producer"], status: "active" },
  { name: "Albemarle Corp", type: "Refiner", jurisdiction: "US-NV", role: "ROLE_REFINER", stellarAddress: "GBTZ...4HRN", credentials: ["Export Control Cleared", "Allied Producer"], status: "active" },
  { name: "BASF Battery", type: "Converter", jurisdiction: "US-MI", role: "ROLE_REFINER", stellarAddress: "GHJK...8PLQ", credentials: ["Allied Producer", "ISO 14001"], status: "active" },
  { name: "Umicore US", type: "Converter", jurisdiction: "CA-ON", role: "ROLE_REFINER", stellarAddress: "GBNX...2VLE", credentials: ["Allied Producer"], status: "pending" },
  { name: "Panasonic Energy", type: "Manufacturer", jurisdiction: "US-KS", role: "ROLE_OEM", stellarAddress: "GPAN...6YTR", credentials: ["CMMC Level 2", "DoD Approved"], status: "active" },
  { name: "L3Harris Technologies", type: "OEM", jurisdiction: "US-FL", role: "ROLE_OEM", stellarAddress: "GDWL...9PKM", credentials: ["CMMC Level 3", "DoD Approved"], status: "active" },
];

const credentials = [
  { name: "Know-Your-Facility", issuer: "DLA", entities: 1, expiry: "2027-01-15" },
  { name: "Domestic Producer", issuer: "DoC/BIS", entities: 1, expiry: "2026-12-31" },
  { name: "Export Control Cleared", issuer: "DoC/BIS", entities: 1, expiry: "2026-09-30" },
  { name: "Allied Producer", issuer: "DoD", entities: 3, expiry: "2027-06-01" },
  { name: "CMMC Level 3", issuer: "CMMC-AB", entities: 1, expiry: "2027-03-15" },
  { name: "DoD Approved", issuer: "DoD", entities: 2, expiry: "2027-06-01" },
];

const Entities = () => (
  <div className="px-6 py-6 space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Entity Management</h1>
        <Badge variant="stellar" className="text-[10px] font-mono">{entities.length} Participants</Badge>
      </div>
      <Button size="sm" className="gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Register Entity
      </Button>
    </div>

    <Tabs defaultValue="registry" className="w-full">
      <TabsList>
        <TabsTrigger value="registry">Entity Registry</TabsTrigger>
        <TabsTrigger value="credentials">Credentials</TabsTrigger>
        <TabsTrigger value="roles">Roles & Access</TabsTrigger>
      </TabsList>

      <TabsContent value="registry">
        <div className="space-y-2">
          {entities.map((entity) => (
            <div key={entity.stellarAddress} className="rounded-lg border border-border bg-card p-4 hover:bg-secondary/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{entity.name}</span>
                  <span className="text-xs text-muted-foreground">({entity.type})</span>
                </div>
                <Badge variant={entity.status === "active" ? "compliant" : "review"} className="text-[10px]">
                  {entity.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{entity.jurisdiction}</span>
                </div>
                <div className="flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">{entity.stellarAddress}</span>
                </div>
                <span className="text-xs font-mono text-primary/60">{entity.role}</span>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {entity.credentials.map((cred) => (
                  <span key={cred} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{cred}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="credentials">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credential</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead className="text-right">Holders</TableHead>
                <TableHead>Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentials.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-medium">{c.name}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.issuer}</TableCell>
                  <TableCell className="text-right text-sm">{c.entities}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.expiry}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="roles">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { role: "ROLE_MINER", label: "Miner", desc: "Extract raw minerals, issue origin certificates", count: 1 },
            { role: "ROLE_REFINER", label: "Refiner / Converter", desc: "Process raw materials, transform tokens", count: 3 },
            { role: "ROLE_OEM", label: "OEM / Manufacturer", desc: "Final assembly, consume upstream tokens", count: 2 },
          ].map((r) => (
            <div key={r.role} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-primary">{r.role}</span>
                <Badge variant="stellar" className="text-[10px]">{r.count}</Badge>
              </div>
              <h3 className="text-sm font-medium text-foreground">{r.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  </div>
);

export default Entities;
