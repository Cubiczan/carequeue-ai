'use client';

import { useSwarmStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Bar } from 'recharts';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function PriceTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const close = payload.find((p) => p.dataKey === 'close')?.value ?? 0;
  const vol = payload.find((p) => p.dataKey === 'volume')?.value ?? 0;
  const prev = payload.find((p) => p.dataKey === 'open')?.value ?? close;
  const isUp = close >= prev;
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">
        {label ? new Date(label).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }) : ''}
      </p>
      <p className={cn('text-sm font-mono font-bold', isUp ? 'text-emerald-400' : 'text-rose-400')}>
        ${close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="text-xs text-muted-foreground font-mono">Vol: {vol.toFixed(2)}</p>
    </div>
  );
}

export function PriceChart() {
  const candles = useSwarmStore((s) => s.candles);
  const isLoading = useSwarmStore((s) => s.isLoading);

  const data = candles.map((c) => ({
    time: c.startedAt,
    open: c.open,
    close: c.close,
    high: c.high,
    low: c.low,
    volume: c.volume,
  }));

  const lastCandle = candles[0];
  const prevCandle = candles[1];
  const isUp = lastCandle ? (lastCandle.close >= (prevCandle?.open ?? lastCandle.open)) : true;
  const currentPrice = lastCandle?.close ?? 0;
  const priceChange = lastCandle && prevCandle ? lastCandle.close - prevCandle.close : 0;
  const priceChangePct = prevCandle?.close ? (priceChange / prevCandle.close) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Price Chart
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-bold font-mono">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={cn('text-xs font-mono font-semibold', priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {isLoading && data.length === 0 ? (
        <Skeleton className="h-[260px] w-full" />
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => new Date(v).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="price"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <YAxis
                yAxisId="volume"
                orientation="right"
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<PriceTooltip />} />
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="hsl(var(--muted))"
                opacity={0.3}
                isAnimationActive={false}
              />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke={isUp ? '#10b981' : '#f43f5e'}
                fill="url(#priceGrad)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: isUp ? '#10b981' : '#f43f5e', fill: 'hsl(var(--card))' }}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="high"
                stroke="transparent"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="low"
                stroke="transparent"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
