'use client';

import { useSwarmStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">
        {label ? new Date(label).toLocaleDateString() : ''}
      </p>
      <p className={cn('text-sm font-mono font-bold', val >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
        {val >= 0 ? '+' : ''}{(val * 100).toFixed(4)}%
      </p>
    </div>
  );
}

export function FundingChart() {
  const fundingHistory = useSwarmStore((s) => s.fundingHistory);
  const isLoading = useSwarmStore((s) => s.isLoading);

  const data = fundingHistory.map((f) => ({
    time: f.effectiveAt,
    rate: f.rate,
  }));

  const latestRate = fundingHistory[0]?.rate ?? 0;
  const isPositive = latestRate >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Funding Rates
        </h3>
        <span className={cn('text-xs font-mono font-bold', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
          {(latestRate * 100).toFixed(4)}%
        </span>
      </div>

      {isLoading && data.length === 0 ? (
        <Skeleton className="h-[160px] w-full" />
      ) : (
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fundingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${(v * 100).toFixed(2)}%`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="rate"
                stroke={isPositive ? '#10b981' : '#f43f5e'}
                fill="url(#fundingGrad)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: isPositive ? '#10b981' : '#f43f5e', fill: 'hsl(var(--card))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
