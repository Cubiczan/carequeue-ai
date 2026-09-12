'use client';

import Image from 'next/image';
import { Hexagon, Wifi, WifiOff, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSwarmStore } from '@/lib/store';
import { useRunSwarm } from '@/lib/hooks';
import { motion } from 'framer-motion';

export function Header() {
  const markets = useSwarmStore((s) => s.markets);
  const selectedMarket = useSwarmStore((s) => s.selectedMarket);
  const setSelectedMarket = useSwarmStore((s) => s.setSelectedMarket);
  const isSwarmRunning = useSwarmStore((s) => s.isSwarmRunning);
  const { runSwarm } = useRunSwarm();

  const isConnected = true;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10">
          <Image
            src="/swarmfi-logo.png"
            alt="SwarmFi"
            width={40}
            height={40}
            className="rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <Hexagon className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-amber-400">Swarm</span>
            <span className="text-emerald-400">Fi</span>
            <span className="text-muted-foreground font-normal ml-1 text-sm">Perps</span>
          </h1>
        </div>
      </div>

      {/* Market Selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedMarket} onValueChange={setSelectedMarket}>
          <SelectTrigger className="w-[180px] bg-secondary/50 border-border/50 font-mono text-sm">
            <SelectValue placeholder="Select Market" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            {markets.map((m) => (
              <SelectItem key={m.ticker} value={m.ticker} className="font-mono text-sm">
                {m.ticker}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Run Swarm Button */}
        <Button
          onClick={() => runSwarm(selectedMarket)}
          disabled={isSwarmRunning}
          className="bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-black font-semibold transition-all duration-300 shadow-lg shadow-amber-500/20"
        >
          {isSwarmRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Run Swarm
            </>
          )}
        </Button>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <Badge
          variant={isConnected ? 'default' : 'destructive'}
          className={`text-xs font-mono ${
            isConnected
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
          }`}
        >
          {isConnected ? (
            <Wifi className="w-3 h-3 mr-1" />
          ) : (
            <WifiOff className="w-3 h-3 mr-1" />
          )}
          {isConnected ? 'dYdX Connected' : 'Disconnected'}
        </Badge>
      </div>
    </motion.header>
  );
}
