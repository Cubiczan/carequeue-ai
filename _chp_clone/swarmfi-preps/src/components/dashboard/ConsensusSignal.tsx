'use client';

import { useSwarmStore, type SignalDirection } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const signalConfig: Record<SignalDirection, { color: string; bg: string; icon: typeof TrendingUp; glow: string }> = {
  LONG: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    icon: TrendingUp,
    glow: 'shadow-emerald-500/25',
  },
  SHORT: {
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/30',
    icon: TrendingDown,
    glow: 'shadow-rose-500/25',
  },
  NEUTRAL: {
    color: 'text-muted-foreground',
    bg: 'bg-muted border-border/30',
    icon: Minus,
    glow: '',
  },
};

export function ConsensusSignal() {
  const signal = useSwarmStore((s) => s.consensusSignal);
  const isLoading = useSwarmStore((s) => s.isLoading);

  if (isLoading && !signal) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-16 w-full mb-4" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  const dir: SignalDirection = signal?.signal ?? 'NEUTRAL';
  const conf = signal?.confidence ?? 0;
  const config = signalConfig[dir];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={cn(
        'rounded-xl border bg-card p-6 transition-all duration-500 shadow-lg',
        config.bg
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className={cn('w-5 h-5', config.color)} />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Consensus Signal
          </h3>
        </div>
        {signal?.timestamp && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(signal.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Signal Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={dir}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4"
        >
          <div className="flex flex-col items-center justify-center">
            {/* Circular Confidence */}
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-border/30"
                />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${conf * 2.64} 264`}
                  className={cn('transition-all duration-1000', config.color)}
                  style={{
                    filter: `drop-shadow(0 0 6px currentColor)`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold font-mono">{conf}%</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-1">Confidence</span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Icon className={cn('w-8 h-8', config.color)} />
              </motion.div>
              <span className={cn('text-4xl font-black tracking-tighter', config.color)}>
                {dir}
              </span>
            </div>

            {/* Agent Vote Summary */}
            {signal?.agentVotes && (
              <div className="flex gap-2 flex-wrap">
                {(['LONG', 'SHORT', 'NEUTRAL'] as const).map((s) => {
                  const count = signal.agentVotes.filter((v) => v.signal === s).length;
                  if (count === 0) return null;
                  return (
                    <Badge
                      key={s}
                      variant="outline"
                      className={cn(
                        'text-xs font-mono',
                        s === 'LONG' && 'border-emerald-500/40 text-emerald-400',
                        s === 'SHORT' && 'border-rose-500/40 text-rose-400',
                        s === 'NEUTRAL' && 'border-border text-muted-foreground'
                      )}
                    >
                      {count}x {s}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Market Label */}
      <div className="mt-4 pt-3 border-t border-border/30">
        <span className="text-xs text-muted-foreground">Market: </span>
        <span className="text-sm font-mono font-semibold">{signal?.market ?? '—'}</span>
      </div>
    </motion.div>
  );
}
