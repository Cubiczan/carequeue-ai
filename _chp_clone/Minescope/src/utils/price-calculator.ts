/**
 * MineScope Price Calculator Utilities
 * 
 * Provides price calculation functions for commodity pricing,
 * including historical simulation, moving averages, and change calculations.
 * 
 * MineScope Price Calculator Utilities
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PricePoint {
  date: string;
  price: number;
  volume?: number;
}

export interface PriceChange {
  absolute: number;
  percentage: number;
  direction: 'up' | 'down' | 'flat';
}

export interface MovingAveragePoint {
  date: string;
  price: number;
  ma20: number;
  ma50: number;
  ma200: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const TRADING_DAYS_PER_YEAR = 252;
const RISK_FREE_RATE = 0.05; // 5% annual risk-free rate

// ─── Price Change Calculations ─────────────────────────────────────────────

/**
 * Calculate the absolute and percentage price change between two prices.
 */
export function calculatePriceChange(current: number, previous: number): PriceChange {
  if (previous === 0) return { absolute: 0, percentage: 0, direction: 'flat' };
  
  const absolute = current - previous;
  const percentage = (absolute / previous) * 100;
  const direction = absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat';

  return {
    absolute: Math.round(absolute * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
    direction,
  };
}

/**
 * Calculate the price change over N periods from the end of a price series.
 */
export function calculatePeriodChange(
  prices: PricePoint[],
  periods: number
): PriceChange {
  if (prices.length < periods + 1) {
    return { absolute: 0, percentage: 0, direction: 'flat' };
  }

  const current = prices[prices.length - 1].price;
  const previous = prices[prices.length - 1 - periods].price;

  return calculatePriceChange(current, previous);
}

// ─── Historical Price Simulation ────────────────────────────────────────────

/**
 * Generate simulated historical price data using Geometric Brownian Motion.
 * This is used for demonstration when live market data is not available.
 * 
 * @param basePrice - Starting price
 * @param days - Number of trading days to simulate
 * @param volatility - Annualized volatility (e.g., 0.30 for 30%)
 * @param drift - Annualized drift rate (default: risk-free rate)
 */
export function generateHistoricalPrices(
  basePrice: number,
  days: number,
  volatility: number,
  drift: number = RISK_FREE_RATE
): PricePoint[] {
  const prices: PricePoint[] = [];
  let currentPrice = basePrice;
  const dt = 1 / TRADING_DAYS_PER_YEAR;

  // Use a seed-like approach for consistency
  let seed = basePrice * 1000;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Geometric Brownian Motion step
    const randomShock = (pseudoRandom() * 2 - 1); // Range: [-1, 1]
    const logReturn = (drift - 0.5 * volatility * volatility) * dt + volatility * Math.sqrt(dt) * randomShock;
    currentPrice = currentPrice * Math.exp(logReturn);

    prices.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(currentPrice * 100) / 100,
    });
  }

  return prices;
}

// ─── Moving Averages ───────────────────────────────────────────────────────

/**
 * Calculate Simple Moving Average (SMA) over a given window.
 */
export function calculateSMA(prices: PricePoint[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += prices[j].price;
    }
    result.push(Math.round((sum / window) * 100) / 100);
  }
  return result;
}

/**
 * Generate combined price data with multiple moving averages.
 */
export function calculateMovingAverages(
  prices: PricePoint[],
  windows: number[] = [20, 50, 200]
): MovingAveragePoint[] {
  const mas = windows.map(w => calculateSMA(prices, w));
  
  return prices.map((point, i) => ({
    date: point.date,
    price: point.price,
    ma20: mas[0]?.[i] ?? NaN,
    ma50: mas[1]?.[i] ?? NaN,
    ma200: mas[2]?.[i] ?? NaN,
  }));
}

// ─── Volatility & Risk Metrics ─────────────────────────────────────────────

/**
 * Calculate annualized historical volatility from price series.
 */
export function calculateVolatility(prices: PricePoint[]): number {
  if (prices.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i].price / prices[i - 1].price));
  }

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / (returns.length - 1);

  return Math.round(Math.sqrt(variance * TRADING_DAYS_PER_YEAR) * 100) / 100;
}

/**
 * Calculate the min, max, and average price over a period.
 */
export function calculatePriceStats(prices: PricePoint[]): {
  min: number;
  max: number;
  average: number;
  median: number;
} {
  const priceValues = prices.map(p => p.price).sort((a, b) => a - b);
  
  const sum = priceValues.reduce((a, b) => a + b, 0);
  const mid = Math.floor(priceValues.length / 2);
  const median = priceValues.length % 2 !== 0
    ? priceValues[mid]
    : (priceValues[mid - 1] + priceValues[mid]) / 2;

  return {
    min: priceValues[0],
    max: priceValues[priceValues.length - 1],
    average: Math.round((sum / priceValues.length) * 100) / 100,
    median: Math.round(median * 100) / 100,
  };
}

// ─── Price Formatting ──────────────────────────────────────────────────────

/**
 * Format a price for display with appropriate currency symbol and units.
 */
export function formatPrice(price: number, unit: string = 'USD/ton'): string {
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(1)}k ${unit}`;
  }
  return `$${price.toLocaleString()} ${unit}`;
}

/**
 * Format a percentage change for display.
 */
export function formatChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Format a large number with commas and optional unit suffix.
 */
export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M tons`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k tons`;
  }
  return `${volume} tons`;
}
