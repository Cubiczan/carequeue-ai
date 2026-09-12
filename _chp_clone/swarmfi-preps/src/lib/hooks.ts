'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSwarmStore } from '@/lib/store';

const API_BASE = '/api';

// ── Generic fetcher ─────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── useMarkets ──────────────────────────────────────────────

export function useMarkets() {
  const setMarkets = useSwarmStore((s) => s.setMarkets);
  const setIsLoading = useSwarmStore((s) => s.setIsLoading);
  const setInitialized = useSwarmStore((s) => s.setInitialized);
  const setSelectedMarket = useSwarmStore((s) => s.setSelectedMarket);
  const initialized = useSwarmStore((s) => s.initialized);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const data = await fetcher<any>(`${API_BASE}/dydx/markets`);
        const markets: any[] = data?.markets?.length ? data.markets : generateMockMarkets();
        setMarkets(markets);
        if (markets.length > 0 && !initialized) {
          setSelectedMarket(markets[0].ticker);
          setInitialized(true);
        }
      } catch {
        const markets = generateMockMarkets();
        setMarkets(markets);
        if (markets.length > 0 && !initialized) {
          setSelectedMarket(markets[0].ticker);
          setInitialized(true);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [setMarkets, setIsLoading, setInitialized, setSelectedMarket, initialized]);
}

// ── useConsensus ────────────────────────────────────────────

export function useConsensus(market: string) {
  const setConsensusSignal = useSwarmStore((s) => s.setConsensusSignal);
  const autoRefresh = useSwarmStore((s) => s.autoRefresh);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetcher<any>(`${API_BASE}/swarm/consensus?market=${market}`);
      setConsensusSignal(data);
    } catch {
      setConsensusSignal(generateMockConsensus(market));
    }
  }, [market, setConsensusSignal]);

  useEffect(() => {
    if (!market) return;
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [market, fetchData, autoRefresh]);
}

// ── useAgentStates ──────────────────────────────────────────

export function useAgentStates(market: string) {
  const setAgents = useSwarmStore((s) => s.setAgents);
  const autoRefresh = useSwarmStore((s) => s.autoRefresh);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetcher<any[]>(`${API_BASE}/swarm/agents?market=${market}`);
      setAgents(data);
    } catch {
      setAgents(generateMockAgents());
    }
  }, [market, setAgents]);

  useEffect(() => {
    if (!market) return;
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [market, fetchData, autoRefresh]);
}

// ── useOrderbook ────────────────────────────────────────────

export function useOrderbook(market: string) {
  const setOrderbook = useSwarmStore((s) => s.setOrderbook);
  const autoRefresh = useSwarmStore((s) => s.autoRefresh);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetcher<any>(`${API_BASE}/dydx/orderbook?market=${market}`);
      const mid = data?.bids?.[0]?.price && data?.asks?.[0]?.price
        ? { ...data, midPrice: (data.bids[0].price + data.asks[0].price) / 2, spread: data.asks[0].price - data.bids[0].price }
        : data;
      setOrderbook(mid);
    } catch {
      setOrderbook(generateMockOrderbook());
    }
  }, [market, setOrderbook]);

  useEffect(() => {
    if (!market) return;
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [market, fetchData, autoRefresh]);
}

// ── useTrades ───────────────────────────────────────────────

export function useTrades(market: string) {
  const setRecentTrades = useSwarmStore((s) => s.setRecentTrades);
  const autoRefresh = useSwarmStore((s) => s.autoRefresh);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetcher<any>(`${API_BASE}/dydx/trades?market=${market}`);
      setRecentTrades(data?.trades || data || []);
    } catch {
      setRecentTrades(generateMockTrades());
    }
  }, [market, setRecentTrades]);

  useEffect(() => {
    if (!market) return;
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [market, fetchData, autoRefresh]);
}

// ── useCandles ──────────────────────────────────────────────

export function useCandles(market: string) {
  const setCandles = useSwarmStore((s) => s.setCandles);

  useEffect(() => {
    if (!market) return;
    (async () => {
      try {
        const data = await fetcher<any>(`${API_BASE}/dydx/candles?market=${market}`);
        setCandles(data?.candles || data || []);
      } catch {
        setCandles(generateMockCandles());
      }
    })();
  }, [market, setCandles]);
}

// ── useFunding ──────────────────────────────────────────────

export function useFunding(market: string) {
  const setFundingHistory = useSwarmStore((s) => s.setFundingHistory);

  useEffect(() => {
    if (!market) return;
    (async () => {
      try {
        const data = await fetcher<any>(`${API_BASE}/dydx/funding?market=${market}`);
        setFundingHistory(data?.funding || data || []);
      } catch {
        setFundingHistory(generateMockFunding());
      }
    })();
  }, [market, setFundingHistory]);
}

// ── useSignalHistory ────────────────────────────────────────

export function useSignalHistory(market: string) {
  const setSignalHistory = useSwarmStore((s) => s.setSignalHistory);

  useEffect(() => {
    if (!market) return;
    (async () => {
      try {
        const data = await fetcher<any[]>(`${API_BASE}/swarm/history?market=${market}`);
        setSignalHistory(data);
      } catch {
        setSignalHistory(generateMockSignalHistory());
      }
    })();
  }, [market, setSignalHistory]);
}

// ── useRunSwarm ─────────────────────────────────────────────

export function useRunSwarm() {
  const setIsSwarmRunning = useSwarmStore((s) => s.setIsSwarmRunning);
  const setIsLoading = useSwarmStore((s) => s.setIsLoading);

  const runSwarm = useCallback(async (market: string) => {
    setIsSwarmRunning(true);
    setIsLoading(true);
    try {
      await fetch(`${API_BASE}/swarm/consensus?market=${encodeURIComponent(market)}`, {
        method: 'POST',
      });
    } catch {
      // silent fail — data will fall back to mock
    } finally {
      setTimeout(() => {
        setIsSwarmRunning(false);
        setIsLoading(false);
      }, 2000);
    }
  }, [setIsSwarmRunning, setIsLoading]);

  return { runSwarm };
}

// ── Mock Data Generators ────────────────────────────────────

const MOCK_MARKETS = [
  { ticker: 'BTC-USD', baseAsset: 'BTC', quoteAsset: 'USD' },
  { ticker: 'ETH-USD', baseAsset: 'ETH', quoteAsset: 'USD' },
  { ticker: 'SOL-USD', baseAsset: 'SOL', quoteAsset: 'USD' },
  { ticker: 'AVAX-USD', baseAsset: 'AVAX', quoteAsset: 'USD' },
  { ticker: 'LINK-USD', baseAsset: 'LINK', quoteAsset: 'USD' },
  { ticker: 'ATOM-USD', baseAsset: 'ATOM', quoteAsset: 'USD' },
  { ticker: 'MATIC-USD', baseAsset: 'MATIC', quoteAsset: 'USD' },
  { ticker: 'ARB-USD', baseAsset: 'ARB', quoteAsset: 'USD' },
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockMarkets() {
  return MOCK_MARKETS.map((m) => ({
    ...m,
    openInterest: rand(100_000_000, 5_000_000_000),
    volume24h: rand(50_000_000, 2_000_000_000),
    price: m.baseAsset === 'BTC' ? rand(62000, 71000) :
           m.baseAsset === 'ETH' ? rand(2400, 3900) :
           m.baseAsset === 'SOL' ? rand(130, 220) :
           m.baseAsset === 'AVAX' ? rand(30, 55) :
           m.baseAsset === 'LINK' ? rand(12, 22) :
           m.baseAsset === 'ATOM' ? rand(7, 14) :
           m.baseAsset === 'MATIC' ? rand(0.5, 1.2) :
           rand(0.8, 1.8),
    change24h: rand(-8, 10),
    fundingRate: rand(-0.01, 0.01),
  }));
}

export function generateMockConsensus(market: string) {
  const signals = ['LONG', 'SHORT', 'NEUTRAL'] as const;
  const signal = pick(signals);
  return {
    market,
    signal,
    confidence: Math.round(rand(55, 95)),
    agentVotes: generateMockAgents().map((a) => ({
      agentType: a.agentType,
      signal: a.lastVote,
    })),
    timestamp: new Date().toISOString(),
  };
}

export function generateMockAgents() {
  const signals = ['LONG', 'SHORT', 'NEUTRAL'] as const;
  const reasons = [
    'Strong bullish momentum detected with increasing volume and positive RSI divergence',
    'Bearish head-and-shoulders pattern forming on 4H chart with declining MACD',
    'Range-bound price action; awaiting breakout confirmation above resistance',
    'Funding rates skewed long — potential short squeeze catalyst',
    'Order flow imbalance: aggressive buyers dominating at bid levels',
    'Whale wallet accumulation pattern detected on-chain over 48h',
    'Volatile conditions — mean reversion expected after 3σ deviation',
    'Breakout above key resistance with strong volume confirmation',
    'Rising open interest with price suggests new trend establishment',
  ];

  const agentTypes = [
    { type: 'momentum', name: 'Momentum Agent', icon: 'TrendingUp' },
    { type: 'mean-reversion', name: 'Mean Reversion Agent', icon: 'ArrowLeftRight' },
    { type: 'whale-watcher', name: 'Whale Watcher', icon: 'Fish' },
    { type: 'order-flow', name: 'Order Flow Agent', icon: 'BarChart3' },
    { type: 'funding-rate', name: 'Funding Rate Agent', icon: 'Percent' },
    { type: 'sentiment', name: 'Sentiment Agent', icon: 'MessageCircle' },
    { type: 'technical', name: 'Technical Agent', icon: 'LineChart' },
    { type: 'volatility', name: 'Volatility Agent', icon: 'Activity' },
    { type: 'correlation', name: 'Correlation Agent', icon: 'Link' },
  ];

  return agentTypes.map((a, i) => ({
    agentType: a.type,
    displayName: a.name,
    icon: a.icon,
    lastVote: signals[i % 3 === 0 ? 0 : i % 3 === 1 ? 0 : 1],
    score: Math.round(rand(40, 98)),
    confidence: Math.round(rand(50, 95)),
    timestamp: new Date(Date.now() - rand(60000, 300000)).toISOString(),
    signal: signals[i % 3 === 0 ? 0 : i % 3 === 1 ? 0 : 1],
    reasoning: reasons[i],
  }));
}

export function generateMockOrderbook() {
  const midPrice = rand(64000, 68000);
  const bids = Array.from({ length: 12 }, (_, i) => ({
    price: midPrice - (i + 1) * rand(0.5, 15),
    size: rand(0.01, 5),
  })).sort((a, b) => b.price - a.price);

  const asks = Array.from({ length: 12 }, (_, i) => ({
    price: midPrice + (i + 1) * rand(0.5, 15),
    size: rand(0.01, 5),
  })).sort((a, b) => a.price - b.price);

  return { bids, asks, spread: asks[0].price - bids[0].price, midPrice };
}

export function generateMockTrades() {
  const midPrice = rand(64000, 68000);
  return Array.from({ length: 30 }, (_, i) => ({
    price: midPrice + rand(-100, 100),
    size: rand(0.001, 3),
    side: Math.random() > 0.5 ? 'BUY' : 'SELL',
    timestamp: new Date(Date.now() - i * rand(2000, 30000)).toISOString(),
  }));
}

export function generateMockCandles() {
  const basePrice = rand(64000, 68000);
  const candles = [];
  let price = basePrice;
  for (let i = 24; i >= 0; i--) {
    const open = price;
    const change = rand(-500, 500);
    const close = open + change;
    const high = Math.max(open, close) + rand(10, 200);
    const low = Math.min(open, close) - rand(10, 200);
    candles.push({
      startedAt: new Date(Date.now() - i * 3600000).toISOString(),
      open: +open.toFixed(2),
      close: +close.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      volume: rand(10, 500),
    });
    price = close;
  }
  return candles;
}

export function generateMockFunding() {
  return Array.from({ length: 20 }, (_, i) => ({
    effectiveAt: new Date(Date.now() - i * 3600000 * 8).toISOString(),
    rate: rand(-0.005, 0.005),
  }));
}

export function generateMockSignalHistory() {
  const signals = ['LONG', 'SHORT', 'NEUTRAL'] as const;
  return Array.from({ length: 15 }, (_, i) => ({
    id: `sig-${i}`,
    timestamp: new Date(Date.now() - i * rand(300000, 3600000)).toISOString(),
    market: pick(MOCK_MARKETS).ticker,
    signal: pick(signals),
    confidence: Math.round(rand(50, 95)),
    agentAgreement: Math.round(rand(40, 100)),
  }));
}
