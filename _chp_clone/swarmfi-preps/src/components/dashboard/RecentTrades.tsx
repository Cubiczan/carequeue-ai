'use client';

import { useSwarmStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { motion } from 'framer-motion';

export function RecentTrades() {
  const trades = useSwarmStore((s) => s.recentTrades);
  const isLoading = useSwarmStore((s) => s.isLoading);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Recent Trades
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          {trades.length} trades
        </span>
      </div>

      {isLoading && trades.length === 0 ? (
        <div className="space-y-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : (
        <ScrollArea className="h-[280px]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-[10px] text-muted-foreground font-mono">Price</TableHead>
                <TableHead className="text-[10px] text-muted-foreground font-mono text-right">Size</TableHead>
                <TableHead className="text-[10px] text-muted-foreground font-mono text-right">Side</TableHead>
                <TableHead className="text-[10px] text-muted-foreground font-mono text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade, i) => (
                <TableRow key={i} className="border-border/10 hover:bg-muted/30">
                  <TableCell className={cn(
                    'text-xs font-mono font-semibold',
                    trade.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    ${trade.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-right text-foreground">
                    {trade.size.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      'inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded',
                      trade.side === 'BUY'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-rose-500/15 text-rose-400'
                    )}>
                      {trade.side}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-right text-muted-foreground">
                    {new Date(trade.timestamp).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
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
