import { ShieldCheck, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MOCK_RISK_ASSESSMENTS, MOCK_VALIDATORS } from "@/lib/liquify";

const policies = [
  { id: "POL-001", name: "Downtime Threshold ≤1h/24h", scope: "All Validators", enforcement: "Auto-jail", status: "active" },
  { id: "POL-002", name: "Missed Blocks ≤10/24h", scope: "Active Validators", enforcement: "Warning", status: "active" },
  { id: "POL-003", name: "No Commission Spike (>50%)", scope: "All Validators", enforcement: "Alert + Review", status: "active" },
  { id: "POL-004", name: "Double Sign Detection", scope: "Consensus", enforcement: "Slash (5%)", status: "active" },
  { id: "POL-005", name: "Self-Bond ≥5% Stake", scope: "New Validators", enforcement: "On-chain Check", status: "draft" },
];

const Compliance = () => {
  const risks = MOCK_RISK_ASSESSMENTS;
  const healthyCount = risks.filter(r => r.status === "healthy").length;
  const flaggedCount = risks.filter(r => r.status !== "healthy").length;

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Risk & Compliance</h1>
        <Badge variant="liquify" className="text-[10px] font-mono">Real-time Monitoring</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Monitored Validators", value: risks.length, color: "text-primary" },
          { label: "Healthy", value: healthyCount, color: "text-green-500" },
          { label: "Flagged", value: flaggedCount, color: "text-yellow-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center">
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="assessments" className="w-full">
        <TabsList>
          <TabsTrigger value="assessments">Risk Assessments</TabsTrigger>
          <TabsTrigger value="policies">Alert Policies</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="assessments">
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Validator</TableHead>
                  <TableHead className="text-right">Risk Score</TableHead>
                  <TableHead className="text-right">Slashing History</TableHead>
                  <TableHead className="text-right">Missed Blocks (24h)</TableHead>
                  <TableHead className="text-right">Downtime (24h)</TableHead>
                  <TableHead>Commission Change</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((r) => {
                  const validator = MOCK_VALIDATORS.find(v => v.id === r.validatorId);
                  return (
                    <TableRow key={r.validatorId}>
                      <TableCell className="text-sm font-medium">{validator?.name || r.validatorId}</TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        <span className={r.riskScore < 20 ? 'text-success' : r.riskScore < 50 ? 'text-warning' : 'text-destructive'}>
                          {r.riskScore}/100
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">{r.slashingHistory}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{r.missedBlocks24h}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{r.downtime24h >= 60 ? `${(r.downtime24h / 60).toFixed(1)}h` : `${r.downtime24h}m`}</TableCell>
                      <TableCell>
                        <Badge variant={r.commissionChange30d ? "review" : "compliant"} className="text-[10px]">
                          {r.commissionChange30d ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.status === "healthy" ? "compliant" : r.status === "warning" ? "review" : "nonCompliant"}
                          className="text-[10px]"
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
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
              { label: "Daily Risk Summary", desc: "Aggregated risk scores and slashing events across all monitored validators", date: "April 2026" },
              { label: "Validator Health Report", desc: "Per-validator uptime, missed blocks, and commission change analysis", date: "Q1 2026" },
              { label: "Slashing Event History", desc: "Complete historical record of all slashing events with severity classification", date: "All time" },
              { label: "Risk Export", desc: "Export validator risk assessments and compliance data as CSV/PDF", date: "On demand" },
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
};

export default Compliance;
