import { create } from 'zustand';

// ── Data Types ──────────────────────────────────────────────

export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface ConsensusSignal {
  market: string;
  signal: SignalDirection;
  confidence: number;
  agentVotes: {
    agentType: string;
    signal: SignalDirection;
  }[];
  timestamp: string;
}

export interface AgentData {
  agentType: string;
  displayName: string;
  icon: string;
  lastVote: SignalDirection;
  score: number;
  confidence: number;
  timestamp: string;
  signal: SignalDirection;
  reasoning: string;
}

export interface OrderbookLevel {
  price: number;
  size: number;
}

export interface OrderbookData {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  spread: number;
  midPrice: number;
}

export interface TradeData {
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  timestamp: string;
}

export interface CandleData {
  startedAt: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface FundingData {
  effectiveAt: string;
  rate: number;
}

export interface MarketData {
  ticker: string;
  baseAsset: string;
  quoteAsset: string;
  openInterest: number;
  volume24h: number;
  price: number;
  change24h: number;
  fundingRate: number;
}

export interface SignalHistoryEntry {
  id: string;
  timestamp: string;
  market: string;
  signal: SignalDirection;
  confidence: number;
  agentAgreement: number;
}

// ── Store Interface ─────────────────────────────────────────

interface SwarmStore {
  selectedMarket: string;
  setSelectedMarket: (market: string) => void;

  consensusSignal: ConsensusSignal | null;
  setConsensusSignal: (signal: ConsensusSignal | null) => void;

  agents: AgentData[];
  setAgents: (agents: AgentData[]) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  isSwarmRunning: boolean;
  setIsSwarmRunning: (running: boolean) => void;

  orderbook: OrderbookData | null;
  setOrderbook: (data: OrderbookData | null) => void;

  recentTrades: TradeData[];
  setRecentTrades: (trades: TradeData[]) => void;

  candles: CandleData[];
  setCandles: (candles: CandleData[]) => void;

  fundingHistory: FundingData[];
  setFundingHistory: (funding: FundingData[]) => void;

  markets: MarketData[];
  setMarkets: (markets: MarketData[]) => void;

  signalHistory: SignalHistoryEntry[];
  setSignalHistory: (history: SignalHistoryEntry[]) => void;

  autoRefresh: boolean;
  setAutoRefresh: (refresh: boolean) => void;

  confidenceThreshold: number;
  setConfidenceThreshold: (threshold: number) => void;

  initialized: boolean;
  setInitialized: (init: boolean) => void;
}

// ── Zustand Store ───────────────────────────────────────────

export const useSwarmStore = create<SwarmStore>((set) => ({
  selectedMarket: 'BTC-USD',
  setSelectedMarket: (market) => set({ selectedMarket: market }),

  consensusSignal: null,
  setConsensusSignal: (signal) => set({ consensusSignal: signal }),

  agents: [],
  setAgents: (agents) => set({ agents }),

  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),

  isSwarmRunning: false,
  setIsSwarmRunning: (running) => set({ isSwarmRunning: running }),

  orderbook: null,
  setOrderbook: (data) => set({ orderbook: data }),

  recentTrades: [],
  setRecentTrades: (trades) => set({ recentTrades: trades }),

  candles: [],
  setCandles: (candles) => set({ candles }),

  fundingHistory: [],
  setFundingHistory: (funding) => set({ fundingHistory: funding }),

  markets: [],
  setMarkets: (markets) => set({ markets }),

  signalHistory: [],
  setSignalHistory: (history) => set({ signalHistory: history }),

  autoRefresh: true,
  setAutoRefresh: (refresh) => set({ autoRefresh: refresh }),

  confidenceThreshold: 60,
  setConfidenceThreshold: (threshold) => set({ confidenceThreshold: threshold }),

  initialized: false,
  setInitialized: (init) => set({ initialized: init }),
}));
