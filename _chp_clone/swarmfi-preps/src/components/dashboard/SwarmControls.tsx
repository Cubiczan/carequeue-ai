'use client';

import { useSwarmStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Gauge, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export function SwarmControls() {
  const autoRefresh = useSwarmStore((s) => s.autoRefresh);
  const setAutoRefresh = useSwarmStore((s) => s.setAutoRefresh);
  const confidenceThreshold = useSwarmStore((s) => s.confidenceThreshold);
  const setConfidenceThreshold = useSwarmStore((s) => s.setConfidenceThreshold);
  const selectedMarket = useSwarmStore((s) => s.selectedMarket);
  const setSelectedMarket = useSwarmStore((s) => s.setSelectedMarket);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="rounded-xl border border-border/50 bg-card p-4 space-y-4"
    >
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        ⚙️ Swarm Controls
      </h3>

      {/* Auto-Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className={cn('w-4 h-4', autoRefresh ? 'text-emerald-400' : 'text-muted-foreground')} />
          <Label htmlFor="auto-refresh" className="text-xs text-foreground cursor-pointer">
            Auto-Refresh
          </Label>
        </div>
        <Switch
          id="auto-refresh"
          checked={autoRefresh}
          onCheckedChange={setAutoRefresh}
        />
      </div>

      {/* Confidence Threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-amber-400" />
            <Label className="text-xs text-foreground">Confidence Threshold</Label>
          </div>
          <span className="text-xs font-mono text-amber-400 font-bold">{confidenceThreshold}%</span>
        </div>
        <Slider
          value={[confidenceThreshold]}
          onValueChange={([v]) => setConfidenceThreshold(v)}
          min={30}
          max={100}
          step={5}
          className="[&_[role=slider]]:bg-amber-400"
        />
      </div>

      {/* Timeframe */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <Label className="text-xs text-foreground">Analysis Timeframe</Label>
        </div>
        <Select defaultValue="1h">
          <SelectTrigger className="h-8 text-xs font-mono bg-secondary/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            <SelectItem value="5m" className="text-xs font-mono">5 Minutes</SelectItem>
            <SelectItem value="15m" className="text-xs font-mono">15 Minutes</SelectItem>
            <SelectItem value="1h" className="text-xs font-mono">1 Hour</SelectItem>
            <SelectItem value="4h" className="text-xs font-mono">4 Hours</SelectItem>
            <SelectItem value="1d" className="text-xs font-mono">1 Day</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Market Quick Switch */}
      <div className="space-y-2">
        <Label className="text-xs text-foreground">Quick Market Switch</Label>
        <div className="flex flex-wrap gap-1.5">
          {['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'LINK-USD'].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMarket(m)}
              className={cn(
                'text-[10px] font-mono px-2 py-1 rounded-md transition-all border',
                selectedMarket === m
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-muted/50 text-muted-foreground border-border/30 hover:border-amber-500/30 hover:text-foreground'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
