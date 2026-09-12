/**
 * MineScope — Price Tracker Component
 * 
 * Interactive commodity price chart with:
 * - Multi-line price history for 5 critical minerals
 * - Time range selector (1W / 1M / 3M / 1Y / ALL)
 * - Mineral type filter (show/hide individual lines)
 * - Rich tooltips with price, change, and comparison data
 * - Sortable price table with current metrics
 * 
 * Interactive commodity price charts with time range selectors and filters.
 */

'use client';

import React, { useState, useMemo } from 'react';
import mineralsData from '../data/minerals.json';

// ─── Types ─────────────────────────────────────────────────────────────────

type TimeRange = '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface MineralFilter {
  [mineralId: string]: boolean;
}

// ─── Time Range Config ─────────────────────────────────────────────────────

const TIME_RANGES: { label: string; value: TimeRange; months: number }[] = [
  { label: '1W', value: '1W', months: 0.25 },
  { label: '1M', value: '1M', months: 1 },
  { label: '3M', value: '3M', months: 3 },
  { label: '1Y', value: '1Y', months: 12 },
  { label: 'ALL', value: 'ALL', months: 24 },
];

const MINERAL_COLORS: Record<string, string> = {
  lithium: '#14b8a6',
  cobalt: '#8b5cf6',
  nickel: '#f59e0b',
  rare_earths: '#ef4444',
  copper: '#f97316',
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function PriceTracker() {
  const [activeRange, setActiveRange] = useState<TimeRange>('3M');
  const [filters, setFilters] = useState<MineralFilter>({
    lithium: true,
    cobalt: true,
    nickel: true,
    rare_earths: true,
    copper: true,
  });
  const [sortField, setSortField] = useState<string>('price');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Toggle mineral filter
  const toggleFilter = (id: string) => {
    setFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Generate chart data points from historical prices
  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    const mineralSeries: Record<string, Record<string, number>> = {};

    mineralsData.forEach((m) => {
      mineralSeries[m.id] = {};
      m.historicalPrices.forEach((p) => {
        allDates.add(p.date);
        mineralSeries[m.id][p.date] = p.price;
      });
    });

    const dates = Array.from(allDates).sort();
    // Filter by selected time range
    const rangeConfig = TIME_RANGES.find((r) => r.value === activeRange);
    const cutoffDate = rangeConfig
      ? new Date(new Date('2025-01').setMonth(new Date('2025-01').getMonth() - rangeConfig.months))
          .toISOString()
          .slice(0, 7)
      : null;

    const filteredDates = cutoffDate
      ? dates.filter((d) => d >= cutoffDate)
      : dates;

    return filteredDates.map((date) => {
      const point: Record<string, any> = { date };
      mineralsData.forEach((m) => {
        point[m.name] = mineralSeries[m.id][date] ?? null;
      });
      return point;
    });
  }, [activeRange]);

  // Sort table
  const sortedMinerals = useMemo(() => {
    return [...mineralsData].sort((a, b) => {
      const aVal = (a as any)[sortField] ?? 0;
      const bVal = (b as any)[sortField] ?? 0;
      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const visibleMinerals = mineralsData.filter((m) => filters[m.id]);

  return (
    <div style={{ color: '#f1f5f9' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
            📈 Commodity Price Tracker
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Historical prices for critical minerals with trend analysis
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ background: '#14b8a6', color: '#fff' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#0d9488')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#14b8a6')}
        >
          📤 Export CSV
        </button>
      </div>

      {/* Time Range + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        {/* Time Range Selector */}
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#142030' }}>
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setActiveRange(range.value)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: activeRange === range.value ? '#14b8a6' : 'transparent',
                color: activeRange === range.value ? '#fff' : '#94a3b8',
              }}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Mineral Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: '#64748b' }}>Filter:</span>
          {mineralsData.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleFilter(m.id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all"
              style={{
                background: filters[m.id] ? `${MINERAL_COLORS[m.id]}20` : '#1e293b',
                color: filters[m.id] ? MINERAL_COLORS[m.id] : '#64748b',
                border: `1px solid ${filters[m.id] ? `${MINERAL_COLORS[m.id]}40` : '#1e293b'}`,
              }}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: MINERAL_COLORS[m.id],
                  opacity: filters[m.id] ? 1 : 0.3,
                }}
              />
              {m.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Price Chart Area ─── */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ background: '#0d1520', border: '1px solid #1e293b' }}
      >
        {/* Y-axis labels and chart area */}
        <div className="flex">
          {/* Y-axis */}
          <div className="flex flex-col justify-between pr-3 text-right" style={{ height: '300px', color: '#64748b', fontSize: '11px' }}>
            <span>$100k</span>
            <span>$80k</span>
            <span>$60k</span>
            <span>$40k</span>
            <span>$20k</span>
          </div>

          {/* Chart grid */}
          <div className="flex-1 relative" style={{ height: '300px' }}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  top: `${i * 25}%`,
                  borderBottom: '1px solid #1e293b',
                }}
              />
            ))}

            {/* Simulated price lines */}
            {visibleMinerals.map((mineral) => {
              const points = mineral.historicalPrices.map((p, idx) => {
                const x = (idx / (mineral.historicalPrices.length - 1)) * 100;
                const maxY = 100000;
                const minY = 5000;
                const y = 100 - ((p.price - minY) / (maxY - minY)) * 100;
                return `${x}%,${Math.max(0, Math.min(100, y))}%`;
              });
              const pathD = `M${points.join(' L')}`;

              return (
                <svg
                  key={mineral.id}
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ overflow: 'visible' }}
                >
                  <path
                    d={pathD}
                    fill="none"
                    stroke={MINERAL_COLORS[mineral.id]}
                    strokeWidth="0.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                </svg>
              );
            })}

            {/* X-axis labels */}
            <div
              className="absolute flex justify-between"
              style={{ bottom: -20, left: 0, right: 0, fontSize: '11px', color: '#64748b' }}
            >
              {chartData
                .filter((_, i) => i % Math.ceil(chartData.length / 5) === 0)
                .map((d, i) => (
                  <span key={i}>{d.date}</span>
                ))}
            </div>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
          {mineralsData.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <span
                className="inline-block rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  background: MINERAL_COLORS[m.id],
                  opacity: filters[m.id] ? 1 : 0.3,
                }}
              />
              <span
                className="text-xs"
                style={{ color: filters[m.id] ? '#94a3b8' : '#475569' }}
              >
                {m.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Price Table ─── */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
        <div className="p-4" style={{ borderBottom: '1px solid #1e293b' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
            Current Prices
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                {[
                  { key: 'name', label: 'Mineral' },
                  { key: 'price', label: 'Price' },
                  { key: 'change', label: 'Change' },
                  { key: 'productionNumeric', label: 'Production' },
                  { key: 'topProducer', label: 'Top Producer' },
                  { key: 'riskScore', label: 'Risk Score' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="text-left px-4 py-3 text-xs font-medium cursor-pointer select-none transition-colors"
                    style={{ color: '#64748b' }}
                    onClick={() => handleSort(col.key)}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                  >
                    {col.label}
                    {sortField === col.key && (
                      <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMinerals.map((mineral) => (
                <tr
                  key={mineral.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid #0f172a' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#142030')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block rounded-full"
                        style={{ width: 8, height: 8, background: MINERAL_COLORS[mineral.id] }}
                      />
                      <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                        {mineral.name}
                      </span>
                      <span className="text-xs" style={{ color: '#64748b' }}>
                        ({mineral.symbol})
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono" style={{ color: '#f1f5f9' }}>
                      ${mineral.price.toLocaleString()}
                    </span>
                    <span className="text-xs ml-1" style={{ color: '#64748b' }}>
                      /ton
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-sm font-mono font-medium"
                      style={{
                        color: mineral.changeDirection === 'up' ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {mineral.change > 0 ? '▲' : '▼'} {Math.abs(mineral.change)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm" style={{ color: '#94a3b8' }}>
                      {mineral.production}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm" style={{ color: '#94a3b8' }}>
                      {mineral.topProducer}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        background: `${getRiskBgColor(mineral.riskScore)}20`,
                        color: getRiskBgColor(mineral.riskScore),
                      }}
                    >
                      {mineral.riskScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getRiskBgColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#eab308';
  return '#22c55e';
}
