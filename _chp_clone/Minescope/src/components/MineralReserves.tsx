/**
 * MineScope — Mineral Reserves Component
 * 
 * Reserve estimation dashboard with:
 * - Bar charts showing reserve distribution by country
 * - Reserve-to-production ratio analysis (years of supply)
 * - Country distribution breakdown
 * - New discovery and project pipeline tracking
 * 
 * Mineral reserve estimates dashboard with depletion projections.
 */

'use client';

import React, { useState } from 'react';
import mineralsData from '../data/minerals.json';

// ─── Component ─────────────────────────────────────────────────────────────

export default function MineralReserves() {
  const [selectedMineral, setSelectedMineral] = useState(mineralsData[0].id);
  const mineral = mineralsData.find((m) => m.id === selectedMineral)!;

  // Calculate years of supply remaining
  const yearsRemaining = Math.round(
    mineral.reserveNumeric / mineral.productionNumeric
  );

  return (
    <div style={{ color: '#f1f5f9' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
            📦 Mineral Reserves
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Global reserve estimates and depletion projections
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: '#14b8a6', color: '#fff' }}
        >
          📤 Export Data
        </button>
      </div>

      {/* Mineral Selector */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {mineralsData.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMineral(m.id)}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: selectedMineral === m.id ? '#14b8a620' : '#1e293b',
              color: selectedMineral === m.id ? '#14b8a6' : '#94a3b8',
              border: `1px solid ${selectedMineral === m.id ? '#14b8a640' : '#1e293b'}`,
            }}
          >
            {m.symbol} {m.name}
          </button>
        ))}
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <span className="text-xs" style={{ color: '#64748b' }}>Global Reserves</span>
          <div className="text-2xl font-bold font-mono mt-1" style={{ color: '#f1f5f9' }}>
            {formatLargeNumber(mineral.reserveNumeric)}
          </div>
          <span className="text-xs" style={{ color: '#475569' }}>tons (proven + probable)</span>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <span className="text-xs" style={{ color: '#64748b' }}>Annual Production</span>
          <div className="text-2xl font-bold font-mono mt-1" style={{ color: '#f1f5f9' }}>
            {formatLargeNumber(mineral.productionNumeric)}
          </div>
          <span className="text-xs" style={{ color: '#475569' }}>tons/year</span>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <span className="text-xs" style={{ color: '#64748b' }}>Years of Supply</span>
          <div
            className="text-2xl font-bold font-mono mt-1"
            style={{ color: yearsRemaining < 50 ? '#ef4444' : yearsRemaining < 100 ? '#eab308' : '#22c55e' }}
          >
            {yearsRemaining}
          </div>
          <span className="text-xs" style={{ color: '#475569' }}>at current production rate</span>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <span className="text-xs" style={{ color: '#64748b' }}>Top Producer</span>
          <div className="text-2xl font-bold mt-1" style={{ color: '#f1f5f9' }}>
            {mineral.topProducer}
          </div>
          <span className="text-xs" style={{ color: '#475569' }}>
            {mineral.topCountries[0]?.share ?? 'N/A'}% global share
          </span>
        </div>
      </div>

      {/* ─── Reserve Distribution Bar Chart ─── */}
      <div className="rounded-xl p-6 mb-6" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
          Reserve Distribution by Country — {mineral.name}
        </h3>

        <div className="flex flex-col gap-3">
          {mineral.topCountries.map((country, idx) => {
            const maxValue = mineral.topCountries[0]?.share ?? 1;
            const barWidth = (country.share / maxValue) * 100;
            const colors = ['#14b8a6', '#0d9488', '#22c55e', '#eab308', '#f97316'];

            return (
              <div key={country.country} className="flex items-center gap-4">
                <div className="w-28 text-right">
                  <span className="text-xs font-medium" style={{ color: '#f1f5f9' }}>
                    {country.country}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="rounded-full overflow-hidden" style={{ height: 28, background: '#1e293b' }}>
                    <div
                      className="h-full rounded-full flex items-center px-3 transition-all duration-700"
                      style={{
                        width: `${barWidth}%`,
                        background: `linear-gradient(90deg, ${colors[idx]}cc, ${colors[idx]}88)`,
                      }}
                    >
                      <span className="text-xs font-bold" style={{ color: '#fff' }}>
                        {country.share}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right">
                  <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
                    {formatLargeNumber(country.volume)} t
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* HHI indicator */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs" style={{ color: '#64748b' }}>HHI:</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: getHHIColor(calculateHHI(mineral.topCountries.map((c) => c.share))) + '20',
              color: getHHIColor(calculateHHI(mineral.topCountries.map((c) => c.share))),
            }}
          >
            {calculateHHI(mineral.topCountries.map((c) => c.share))}
          </span>
          <span className="text-xs" style={{ color: '#475569' }}>
            ({getHHILabel(calculateHHI(mineral.topCountries.map((c) => c.share)))})
          </span>
        </div>
      </div>

      {/* ─── Depletion Projection ─── */}
      <div className="rounded-xl p-6 mb-6" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
          📉 Depletion Projection — {mineral.name}
        </h3>

        <div className="relative" style={{ height: '200px' }}>
          {/* Grid */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute left-0 right-0"
              style={{ top: `${i * 25}%`, borderBottom: '1px dashed #1e293b' }}
            />
          ))}

          {/* Projection area */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="depletionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path
              d="M 0 10 L 25 25 L 50 45 L 75 70 L 100 95 L 100 100 L 0 100 Z"
              fill="url(#depletionGrad)"
            />
            <path
              d="M 0 10 L 25 25 L 50 45 L 75 70 L 100 95"
              fill="none"
              stroke="#ef4444"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          </svg>

          {/* Labels */}
          <div className="absolute flex justify-between" style={{ bottom: -20, left: 0, right: 0 }}>
            <span className="text-xs" style={{ color: '#64748b' }}>2025</span>
            <span className="text-xs" style={{ color: '#64748b' }}>2030</span>
            <span className="text-xs" style={{ color: '#64748b' }}>2035</span>
            <span className="text-xs" style={{ color: '#64748b' }}>2040</span>
            <span className="text-xs" style={{ color: '#64748b' }}>2045</span>
          </div>
          <div className="absolute right-0 flex flex-col justify-between" style={{ top: 0, bottom: 20, height: '200px' }}>
            <span className="text-xs" style={{ color: '#64748b' }}>{formatLargeNumber(mineral.reserveNumeric)}</span>
            <span className="text-xs" style={{ color: '#64748b' }}>0</span>
          </div>
        </div>

        <p className="text-xs mt-6" style={{ color: '#475569' }}>
          ⚠️ Projected reserves depleted by ~{2025 + yearsRemaining} at current production rates. 
          Demand growth is projected to accelerate depletion. New discoveries and recycling 
          will be critical to extend supply.
        </p>
      </div>

      {/* ─── All Minerals Comparison ─── */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
        <div className="p-4" style={{ borderBottom: '1px solid #1e293b' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
            All Minerals — Reserve Comparison
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>Mineral</th>
                <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>Reserves</th>
                <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>Production/yr</th>
                <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>Yrs Remaining</th>
                <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>Top Producer</th>
              </tr>
            </thead>
            <tbody>
              {mineralsData
                .sort((a, b) => {
                  const aRatio = a.reserveNumeric / a.productionNumeric;
                  const bRatio = b.reserveNumeric / b.productionNumeric;
                  return aRatio - bRatio;
                })
                .map((m) => {
                  const yrs = Math.round(m.reserveNumeric / m.productionNumeric);
                  return (
                    <tr
                      key={m.id}
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid #0f172a' }}
                      onClick={() => setSelectedMineral(m.id)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#142030')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: '#f1f5f9' }}>
                        {m.symbol} — {m.name}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-right" style={{ color: '#94a3b8' }}>
                        {formatLargeNumber(m.reserveNumeric)} t
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-right" style={{ color: '#94a3b8' }}>
                        {formatLargeNumber(m.productionNumeric)} t
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="text-sm font-bold font-mono"
                          style={{ color: yrs < 50 ? '#ef4444' : yrs < 100 ? '#eab308' : '#22c55e' }}
                        >
                          {yrs}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center" style={{ color: '#94a3b8' }}>
                        {m.topProducer}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatLargeNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}

function calculateHHI(shares: number[]): number {
  return Math.round(shares.reduce((sum, share) => sum + share * share, 0));
}

function getHHIColor(hhi: number): string {
  if (hhi >= 2500) return '#ef4444';
  if (hhi >= 1500) return '#eab308';
  return '#22c55e';
}

function getHHILabel(hhi: number): string {
  if (hhi >= 2500) return 'Highly Concentrated';
  if (hhi >= 1500) return 'Moderately Concentrated';
  return 'Unconcentrated';
}
