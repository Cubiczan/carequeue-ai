'use client';

import { useEffect, useState } from 'react';
import { useSwarmStore } from '@/lib/store';
import {
  useMarkets,
  useConsensus,
  useAgentStates,
  useOrderbook,
  useTrades,
  useCandles,
  useFunding,
  useSignalHistory,
} from '@/lib/hooks';
import { Header } from '@/components/dashboard/Header';
import { ConsensusSignal } from '@/components/dashboard/ConsensusSignal';
import { AgentSwarmGrid } from '@/components/dashboard/AgentSwarmGrid';
import { FundingChart } from '@/components/dashboard/FundingChart';
import { PriceChart } from '@/components/dashboard/PriceChart';
import { OrderBook } from '@/components/dashboard/OrderBook';
import { RecentTrades } from '@/components/dashboard/RecentTrades';
import { SignalHistory } from '@/components/dashboard/SignalHistory';
import { SwarmControls } from '@/components/dashboard/SwarmControls';
import { Hexagon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Loading Splash ──────────────────────────────────────────

function LoadingSplash() {
  return (
    <motion.div
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    >
      {/* Animated hexagon grid */}
      <div className="relative w-40 h-40 mb-8">
        {[...Array(7)].map((_, i) => {
          const angle = (i * 60) * (Math.PI / 180);
          const radius = i === 0 ? 0 : 55;
          const x = i === 0 ? 80 : 80 + Math.cos(angle - Math.PI / 2) * radius - 16;
          const y = i === 0 ? 80 : 80 + Math.sin(angle - Math.PI / 2) * radius - 16;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.4, type: 'spring' }}
              className="absolute"
              style={{ left: x, top: y }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              >
                <Hexagon
                  className="w-8 h-8"
                  style={{
                    fill: i === 0 ? '#f59e0b' : 'none',
                    stroke: i === 0 ? '#f59e0b' : i % 2 === 0 ? '#10b981' : '#f59e0b',
                    strokeWidth: 1.5,
                    filter: `drop-shadow(0 0 6px ${i === 0 ? '#f59e0b' : i % 2 === 0 ? '#10b981' : '#f59e0b'})`,
                  }}
                />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-3xl font-black tracking-tight mb-2"
      >
        <span className="text-amber-400">Swarm</span>
        <span className="text-emerald-400">Fi</span>
        <span className="text-muted-foreground font-light ml-1">Perps</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-sm text-muted-foreground mb-6"
      >
        AI Agent Swarm Trading Signals
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="flex items-center gap-2 text-amber-400"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs font-mono">Initializing swarm network...</span>
      </motion.div>
    </motion.div>
  );
}

// ── Market Ticker Bar ───────────────────────────────────────

function MarketTicker() {
  const markets = useSwarmStore((s) => s.markets);

  if (markets.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="flex items-center gap-4 px-4 py-2 border-b border-border/30 bg-card/30 overflow-x-auto"
    >
      {markets.map((m) => (
        <div key={m.ticker} className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono font-semibold text-foreground">{m.ticker}</span>
          <span className="text-xs font-mono text-muted-foreground">
            ${m.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span
            className={`text-[10px] font-mono font-bold ${
              m.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
          </span>
        </div>
      ))}
    </motion.div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function Home() {
  const selectedMarket = useSwarmStore((s) => s.selectedMarket);
  const isLoading = useSwarmStore((s) => s.isLoading);
  const initialized = useSwarmStore((s) => s.initialized);
  const [showSplash, setShowSplash] = useState(true);

  // Initialize markets
  useMarkets();

  // Data hooks — only fire when market is selected and initialized
  useConsensus(initialized ? selectedMarket : '');
  useAgentStates(initialized ? selectedMarket : '');
  useOrderbook(initialized ? selectedMarket : '');
  useTrades(initialized ? selectedMarket : '');
  useCandles(initialized ? selectedMarket : '');
  useFunding(initialized ? selectedMarket : '');
  useSignalHistory(initialized ? selectedMarket : '');

  // Hide splash after initial load
  useEffect(() => {
    if (initialized) {
      const timer = setTimeout(() => setShowSplash(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [initialized]);

  return (
    <div className="min-h-screen bg-background">
      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && <LoadingSplash />}
      </AnimatePresence>

      {/* Dashboard */}
      {!showSplash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen"
        >
          <Header />
          <MarketTicker />

          <main className="p-4 space-y-4 max-w-[1600px] mx-auto">
            {/* Row 1: Consensus + Agent Grid + Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-3">
                <ConsensusSignal />
                <div className="mt-4">
                  <SwarmControls />
                </div>
              </div>
              <div className="lg:col-span-9">
                <AgentSwarmGrid />
              </div>
            </div>

            {/* Row 2: Funding + Price Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1">
                <FundingChart />
              </div>
              <div className="lg:col-span-3">
                <PriceChart />
              </div>
            </div>

            {/* Row 3: OrderBook + Recent Trades */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <OrderBook />
              <RecentTrades />
            </div>

            {/* Row 4: Signal History */}
            <SignalHistory />

            {/* Footer */}
            <div className="text-center py-4 text-xs text-muted-foreground">
              <p>
                <span className="text-amber-400">Swarm</span>
                <span className="text-emerald-400">Fi</span>
                <span className="ml-1">Perps</span>
                <span className="mx-2">•</span>
                AI Agent Swarm Trading Signals
                <span className="mx-2">•</span>
                Powered by dYdX
              </p>
            </div>
          </main>
        </motion.div>
      )}
    </div>
  );
}
