import { Coins, Plus, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MOCK_POSITIONS, MOCK_STAKING_EVENTS, MOCK_VALIDATORS } from "@/lib/liquify";

const statusColor = { active: "compliant" as const, unbonding: "review" as const, pending: "nonCompliant" as const };

const Assets = () => {
  const positions = MOCK_POSITIONS;
  const events = MOCK_STAKING_EVENTS;

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coins className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Staking Positions</h1>
          <Badge variant="liquify" className="text-[10px] font-mono">{positions.length} Positions</Badge>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Stake BNB
        </Button>
      </div>

      <Tabs defaultValue="positions" className="w-full">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="positions">
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Validator</TableHead>
                  <TableHead className="text-right">Staked (BNB)</TableHead>
                  <TableHead className="text-right">Pending Yield</TableHead>
                  <TableHead className="text-right">lstBNB Balance</TableHead>
                  <TableHead className="text-right">Value (USD)</TableHead>
                  <TableHead>Entry Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p) => {
                  const validator = MOCK_VALIDATORS.find((v) => v.id === p.validatorId);
                  return (
                    <TableRow key={p.validatorId}>
                      <TableCell className="font-medium text-sm">{validator?.name || p.validatorId}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{p.stakedAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-mono text-success">+{p.pendingRewards}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{p.lstTokenBalance.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-mono">${p.lstTokenValue.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.entryDate}</TableCell>
                      <TableCell><Badge variant={statusColor[p.status]} className="text-[10px]">{p.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Delegator</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs text-primary/80">{e.id}</TableCell>
                    <TableCell><Badge variant="liquify" className="text-[10px] font-mono">{e.type}</Badge></TableCell>
                    <TableCell className="text-xs">{e.detail}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{e.delegator}</TableCell>
                    <TableCell className="text-right text-sm font-mono">{e.amount ? e.amount.toLocaleString() : "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-primary/70">#{e.blockNumber.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.timestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: ArrowDownToLine, label: "Stake BNB", desc: "Delegate BNB to a validator and receive lstBNB liquid staking tokens in return" },
              { icon: Coins, label: "Claim Rewards", desc: "Claim accumulated staking rewards as additional lstBNB tokens" },
              { icon: ArrowUpFromLine, label: "Unstake", desc: "Initiate unbonding of lstBNB back to native BNB (7-day unbonding period)" },
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
};

export default Assets;
