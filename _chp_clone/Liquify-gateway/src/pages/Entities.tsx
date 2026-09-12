import { Server, Plus, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MOCK_VALIDATORS } from "@/lib/liquify";

const Entities = () => {
  const validators = MOCK_VALIDATORS;

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Validator Directory</h1>
          <Badge variant="liquify" className="text-[10px] font-mono">{validators.length} Validators</Badge>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Validator
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Validators</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="tiers">Delegation Tiers</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="space-y-2">
            {validators.map((val) => (
              <div key={val.id} className="rounded-lg border border-border bg-card p-4 hover:bg-secondary/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{val.name}</span>
                    <span className="text-xs text-muted-foreground">({val.moniker})</span>
                  </div>
                  <Badge variant={val.status === "active" ? "compliant" : "nonCompliant"} className="text-[10px]">
                    {val.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-muted-foreground">
                    APR: <span className="font-mono text-primary">{val.apr}%</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Commission: <span className="font-mono text-foreground">{val.commission}%</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Stake: <span className="font-mono text-foreground">{val.activeStake.toLocaleString()} BNB</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Uptime: <span className="font-mono text-foreground">{val.uptime}%</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Delegators: <span className="font-mono text-foreground">{val.delegators.toLocaleString()}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Validator</TableHead>
                  <TableHead className="text-right">APR</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Stake (BNB)</TableHead>
                  <TableHead className="text-right">Uptime</TableHead>
                  <TableHead className="text-right">Delegators</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validators.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm font-medium">{v.name}</TableCell>
                    <TableCell className="text-right text-sm font-mono text-primary">{v.apr}%</TableCell>
                    <TableCell className="text-right text-sm font-mono">{v.commission}%</TableCell>
                    <TableCell className="text-right text-sm font-mono">{v.activeStake.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm font-mono">{v.uptime}%</TableCell>
                    <TableCell className="text-right text-sm">{v.delegators.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={v.status === "active" ? "compliant" : "nonCompliant"} className="text-[10px]">
                        {v.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="tiers">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { tier: "Top 10 Validator", threshold: "≥100K BNB", desc: "Highest delegation, institutional-grade validators with proven track records", count: validators.filter(v => v.activeStake >= 100000).length },
              { tier: "Professional Validator", threshold: "≥50K BNB", desc: "Experienced validators with significant self-bond and reliable uptime", count: validators.filter(v => v.activeStake >= 50000 && v.activeStake < 100000).length },
              { tier: "Community Validator", threshold: "<50K BNB", desc: "Emerging validators building delegation and establishing reputation", count: validators.filter(v => v.activeStake < 50000).length },
            ].map((t) => (
              <div key={t.tier} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-primary">{t.threshold}</span>
                  <Badge variant="liquify" className="text-[10px]">{t.count}</Badge>
                </div>
                <h3 className="text-sm font-medium text-foreground">{t.tier}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Entities;
