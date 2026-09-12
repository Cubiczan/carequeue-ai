import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const policies = [
  { id: "POL-001", name: "Domestic Sourcing ≥50%", scope: "All Assets", enforcement: "Soroban", status: "active" },
  { id: "POL-002", name: "Allied Nation Origin Only", scope: "Refined Minerals", enforcement: "Soroban", status: "active" },
  { id: "POL-003", name: "CMMC Level 2+ Required", scope: "OEM Entities", enforcement: "On-chain Check", status: "active" },
  { id: "POL-004", name: "Export Control Clearance", scope: "Cross-border Transfers", enforcement: "Soroban", status: "draft" },
  { id: "POL-005", name: "Environmental Certification", scope: "Miners", enforcement: "Manual + On-chain", status: "active" },
];

const attestations = [
  { entity: "Piedmont Lithium", policy: "Domestic Sourcing ≥50%", result: "pass", verifier: "DLA", ledger: "#56,234,891", date: "2026-03-29" },
  { entity: "Albemarle Corp", policy: "Allied Nation Origin Only", result: "pass", verifier: "DoC/BIS", ledger: "#56,234,920", date: "2026-03-29" },
  { entity: "Umicore US", policy: "Allied Nation Origin Only", result: "review", verifier: "DoD", ledger: "#56,235,100", date: "2026-03-28" },
  { entity: "L3Harris Technologies", policy: "CMMC Level 2+ Required", result: "pass", verifier: "CMMC-AB", ledger: "#56,235,200", date: "2026-03-28" },
  { entity: "BASF Battery", policy: "Environmental Certification", result: "pass", verifier: "EPA", ledger: "#56,235,050", date: "2026-03-27" },
  { entity: "Umicore US", policy: "Export Control Clearance", result: "fail", verifier: "DoC/BIS", ledger: "#56,235,300", date: "2026-03-26" },
];

const resultIcon = { pass: CheckCircle2, review: AlertTriangle, fail: XCircle };
const resultVariant = { pass: "compliant" as const, review: "review" as const, fail: "nonCompliant" as const };

const Compliance = () => (
  <div className="px-6 py-6 space-y-6">
    <div className="flex items-center gap-3">
      <ShieldCheck className="w-5 h-5 text-primary" />
      <h1 className="text-xl font-semibold text-foreground">Compliance</h1>
      <Badge variant="stellar" className="text-[10px] font-mono">On-chain Enforcement</Badge>
    </div>

    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Policies Active", value: policies.filter(p => p.status === "active").length, color: "text-primary" },
        { label: "Attestations Passed", value: attestations.filter(a => a.result === "pass").length, color: "text-green-500" },
        { label: "Flagged for Review", value: attestations.filter(a => a.result !== "pass").length, color: "text-yellow-500" },
      ].map((s) => (
        <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center">
          <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
        </div>
      ))}
    </div>

    <Tabs defaultValue="attestations" className="w-full">
      <TabsList>
        <TabsTrigger value="attestations">Attestations</TabsTrigger>
        <TabsTrigger value="policies">Policies</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="attestations">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Verifier</TableHead>
                <TableHead>Ledger</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attestations.map((a, i) => {
                const Icon = resultIcon[a.result];
                return (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{a.entity}</TableCell>
                    <TableCell className="text-xs">{a.policy}</TableCell>
                    <TableCell>
                      <Badge variant={resultVariant[a.result]} className="text-[10px] gap-1">
                        <Icon className="w-3 h-3" /> {a.result}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.verifier}</TableCell>
                    <TableCell className="font-mono text-xs text-primary/70">{a.ledger}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.date}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="policies">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Enforcement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-primary/80">{p.id}</TableCell>
                  <TableCell className="text-sm font-medium">{p.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.scope}</TableCell>
                  <TableCell className="font-mono text-xs">{p.enforcement}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "compliant" : "review"} className="text-[10px]">
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="reports">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Monthly Compliance Summary", desc: "Aggregated pass/fail rates across all entities and policies", date: "March 2026" },
            { label: "Entity Risk Assessment", desc: "Per-entity compliance score with flagged credentials", date: "Q1 2026" },
            { label: "Regulatory Filing (FASAB)", desc: "Auto-generated report for federal acquisition compliance", date: "2026-03-15" },
            { label: "Audit Export", desc: "Full on-chain attestation history as CSV/PDF", date: "On demand" },
          ].map((r) => (
            <div key={r.label} className="rounded-lg border border-border bg-card p-5 hover:bg-secondary/20 transition-colors cursor-pointer">
              <FileText className="w-5 h-5 text-primary mb-2" />
              <h3 className="text-sm font-medium text-foreground">{r.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
              <span className="text-[10px] text-muted-foreground/60 mt-2 block">{r.date}</span>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  </div>
);

export default Compliance;
