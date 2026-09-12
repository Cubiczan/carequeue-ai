'use client';

import { useSwarmStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

export function OrderBook() {
  const orderbook = useSwarmStore((s) => s.orderbook);
  const isLoading = useSwarmStore((s) => s.isLoading);

  const bids = orderbook?.bids ?? [];
  const asks = orderbook?.asks ?? [];
  const maxSize = Math.max(
    ...bids.map((b) => b.size),
    ...asks.map((a) => a.size),
    0.01
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Order Book
        </h3>
        {orderbook && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">
              Spread: <span className="text-foreground">${orderbook.spread.toFixed(2)}</span>
            </span>
            <span className="font-mono">
              Mid: <span className="text-amber-400">${orderbook.midPrice.toFixed(2)}</span>
            </span>
          </div>
        )}
      </div>

      {isLoading && !orderbook ? (
        <div className="space-y-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Asks (reversed so lowest ask is at bottom) */}
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-mono">
              <span>Price</span>
              <span>Size</span>
            </div>
            <ScrollArea className="h-[240px]">
              <div className="space-y-[1px]">
                {[...asks].reverse().map((ask, i) => (
                  <div key={i} className="relative flex justify-between px-2 py-[2px] text-xs font-mono">
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-rose-500/15"
                      style={{ width: `${(ask.size / maxSize) * 100}%` }}
                    />
                    <span className="relative text-rose-400">{ask.price.toFixed(2)}</span>
                    <span className="relative text-muted-foreground">{ask.size.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Bids */}
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-mono">
              <span>Price</span>
              <span>Size</span>
            </div>
            <ScrollArea className="h-[240px]">
              <div className="space-y-[1px]">
                {bids.map((bid, i) => (
                  <div key={i} className="relative flex justify-between px-2 py-[2px] text-xs font-mono">
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/15"
                      style={{ width: `${(bid.size / maxSize) * 100}%` }}
                    />
                    <span className="relative text-emerald-400">{bid.price.toFixed(2)}</span>
                    <span className="relative text-muted-foreground">{bid.size.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </motion.div>
  );
}
