import { Activity, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MOCK_STAKING_EVENTS } from "@/lib/liquify";

const Events = () => {
  const events = MOCK_STAKING_EVENTS;

  const typeColorMap: Record<string, "compliant" | "review" | "liquify" | "nonCompliant"> = {
    stake: "compliant",
    unstake: "review",
    claim_reward: "liquify",
    redelegate: "liquify",
    validator_jailed: "nonCompliant",
    slash_event: "nonCompliant",
  };

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Event Log</h1>
          <Badge variant="liquify" className="text-[10px] font-mono">{events.length} Events</Badge>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filter
        </Button>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Staking Events</TabsTrigger>
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
                  <TableHead>Delegator</TableHead>
                  <TableHead>Validator</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs text-primary/80">{e.id}</TableCell>
                    <TableCell>
                      <Badge variant={typeColorMap[e.type] || "liquify"} className="text-[10px] font-mono">{e.type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{e.detail}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{e.delegator}</TableCell>
                    <TableCell className="text-sm">{e.validator}</TableCell>
                    <TableCell className="font-mono text-xs text-primary/70">#{e.blockNumber.toLocaleString()}</TableCell>
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
                  <TableHead>Gas Fee</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.txHash + e.id}>
                    <TableCell className="font-mono text-xs text-primary/80">{e.txHash}</TableCell>
                    <TableCell className="text-xs">{e.type.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant="compliant" className="text-[10px]">
                        Confirmed
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{(Math.random() * 0.01 + 0.001).toFixed(5)} BNB</TableCell>
                    <TableCell className="font-mono text-xs text-primary/70">#{e.blockNumber.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.timestamp}</TableCell>
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
              <span className="text-xs text-muted-foreground">Listening to staking events on BNB Chain</span>
            </div>
            {events.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
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
};

export default Events;
