'use client';

import { useSwarmStore, type SignalDirection } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { motion } from 'framer-motion';

const signalBadgeClass: Record<SignalDirection, string> = {
  LONG: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  SHORT: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  NEUTRAL: 'bg-muted text-muted-foreground border-border/30',
};

export function SignalHistory() {
  const signalHistory = useSwarmStore((s) => s.signalHistory);
  const isLoading = useSwarmStore((s) => s.isLoading);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          📡 Signal History
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          {signalHistory.length} signals
        </span>
      </div>

      {isLoading && signalHistory.length === 0 ? (
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <ScrollArea className="max-h-[300px]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-[10px] text-muted-foreground font-mono">Time</TableHead>
                <TableHead className="text-[10px] text-muted-foreground font-mono">Market</TableHead>
                <TableHead className="text-[10px] text-muted-foreground font-mono">Signal</TableHead>
                <TableHead className="text-[10px] text-muted-foreground font-mono text-right">Confidence</TableHead>
                <TableHead className="text-[10px] text-muted-foreground font-mono text-right">Agreement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signalHistory.map((entry) => (
                <TableRow key={entry.id} className="border-border/10 hover:bg-muted/30">
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-semibold text-foreground">
                    {entry.market}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] font-mono font-bold', signalBadgeClass[entry.signal])}
                    >
                      {entry.signal}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            entry.confidence >= 70 ? 'bg-emerald-500' :
                            entry.confidence >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          )}
                          style={{ width: `${entry.confidence}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground">{entry.confidence}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-right text-muted-foreground">
                    {entry.agentAgreement}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </motion.div>
  );
}
