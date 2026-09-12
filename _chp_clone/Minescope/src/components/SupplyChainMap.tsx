/**
 * MineScope — Supply Chain Map Component
 * 
 * Interactive world map visualization showing:
 * - Color-coded countries by production concentration (HHI)
 * - Click-to-drill country detail panels
 * - Mineral type filter
 * - Toggle layers for mines, trade routes, risk overlay
 * - Hover tooltips with key metrics
 * 
 * Interactive world map with country drill-down and risk overlay.
 */

'use client';

import React, { useState } from 'react';
import countriesData from '../data/countries.json';

// ─── Types ─────────────────────────────────────────────────────────────────

type SelectedCountry = (typeof countriesData)[number];

// ─── Component ─────────────────────────────────────────────────────────────

export default function SupplyChainMap() {
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);
  const [mineralFilter, setMineralFilter] = useState<string>('all');
  const [showRiskOverlay, setShowRiskOverlay] = useState(false);

  // Filter countries by selected mineral
  const visibleCountries = countriesData.filter((c) =>
    mineralFilter === 'all' || c.minerals.includes(mineralFilter)
  );

  return (
    <div style={{ color: '#f1f5f9' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
            🗺️ Supply Chain Map
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Interactive world map of mining operations — click a country for details
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        {/* Mineral Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: '#64748b' }}>Mineral:</span>
          <select
            value={mineralFilter}
            onChange={(e) => setMineralFilter(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{
              background: '#142030',
              color: '#f1f5f9',
              border: '1px solid #1e293b',
            }}
          >
            <option value="all">All Minerals</option>
            <option value="lithium">Lithium</option>
            <option value="cobalt">Cobalt</option>
            <option value="nickel">Nickel</option>
            <option value="rare_earths">Rare Earths</option>
            <option value="copper">Copper</option>
          </select>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRiskOverlay(!showRiskOverlay)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              background: showRiskOverlay ? '#ef444420' : '#1e293b',
              color: showRiskOverlay ? '#ef4444' : '#64748b',
              border: `1px solid ${showRiskOverlay ? '#ef444440' : '#1e293b'}`,
            }}
          >
            <span style={{ fontSize: 10 }}>⚠️</span>
            Risk Overlay
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ background: '#1e293b', color: '#64748b', border: '1px solid #1e293b' }}
          >
            <span style={{ fontSize: 10 }}>📍</span>
            Mine Locations
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ background: '#1e293b', color: '#64748b', border: '1px solid #1e293b' }}
          >
            <span style={{ fontSize: 10 }}>🚢</span>
            Trade Routes
          </button>
        </div>
      </div>

      {/* ─── Map Layout ─── */}
      <div className="flex gap-4" style={{ minHeight: '480px' }}>
        {/* Map Area */}
        <div
          className="flex-1 rounded-xl p-6 relative"
          style={{
            background: '#0d1520',
            border: '1px solid #1e293b',
          }}
        >
          {/* Simplified World Map Representation */}
          <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {visibleCountries.map((country) => {
              const avgRisk =
                Object.values(country.riskFactors).reduce((a, b) => a + b, 0) /
                Object.values(country.riskFactors).length;
              const bgColor = showRiskOverlay
                ? getRiskColorAlpha(avgRisk, 0.3)
                : '#142030';

              return (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country)}
                  className="rounded-lg p-3 text-left transition-all duration-200"
                  style={{
                    background: bgColor,
                    border: `1px solid ${
                      selectedCountry?.code === country.code
                        ? '#14b8a6'
                        : showRiskOverlay
                        ? getRiskColorAlpha(avgRisk, 0.5)
                        : '#1e293b'
                    }`,
                    boxShadow:
                      selectedCountry?.code === country.code
                        ? '0 0 15px rgba(20, 184, 166, 0.2)'
                        : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCountry?.code !== country.code) {
                      e.currentTarget.style.borderColor = '#14b8a680';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCountry?.code !== country.code) {
                      e.currentTarget.style.borderColor = '#1e293b';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div className="text-lg mb-1">{country.flag}</div>
                  <div
                    className="text-xs font-medium truncate"
                    style={{ color: '#f1f5f9' }}
                    title={country.name}
                  >
                    {country.name}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {country.minerals.slice(0, 3).map((m) => (
                      <span
                        key={m}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: '#1a2940', color: '#64748b', fontSize: '9px' }}
                      >
                        {m.slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-4" style={{ borderTop: '1px solid #1e293b' }}>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-sm"
                    style={{
                      width: 16,
                      height: 10,
                      background: ['#22c55e', '#eab308', '#f97316', '#ef4444', '#dc2626'][i],
                    }}
                  />
                ))}
              </div>
              <span className="text-xs" style={{ color: '#64748b' }}>
                Low → High Risk
              </span>
            </div>
            <div className="text-xs" style={{ color: '#475569' }}>
              {visibleCountries.length} countries shown · Click for details
            </div>
          </div>
        </div>

        {/* ─── Country Detail Panel ─── */}
        {selectedCountry && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              width: '360px',
              minWidth: '360px',
              background: '#0d1520',
              border: '1px solid #1e293b',
            }}
          >
            {/* Country Header */}
            <div
              className="p-5"
              style={{ borderBottom: '1px solid #1e293b' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 32 }}>{selectedCountry.flag}</span>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>
                      {selectedCountry.name}
                    </h3>
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      {selectedCountry.region} · {selectedCountry.code}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: '#64748b' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1a2940')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto" style={{ maxHeight: '400px' }}>
              {/* Production Overview */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold mb-3" style={{ color: '#14b8a6' }}>
                  📊 Production Overview
                </h4>
                <div className="flex flex-col gap-2">
                  {Object.entries(selectedCountry.productionVolume).map(([mineral, volume]) => (
                    <div
                      key={mineral}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ background: '#142030' }}
                    >
                      <span className="text-xs capitalize" style={{ color: '#f1f5f9' }}>
                        {mineral.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
                          {formatVolume(volume)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold mb-3" style={{ color: '#ef4444' }}>
                  ⚠️ Risk Assessment
                </h4>
                <div className="flex items-center justify-center mb-3">
                  <div
                    className="flex items-center justify-center rounded-full font-bold"
                    style={{
                      width: 64,
                      height: 64,
                      background: `${getRiskColor(getCompositeRisk(selectedCountry))}20`,
                      color: getRiskColor(getCompositeRisk(selectedCountry)),
                      fontSize: '20px',
                    }}
                  >
                    {getCompositeRisk(selectedCountry)}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {Object.entries(selectedCountry.riskFactors).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs capitalize" style={{ color: '#94a3b8' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-xs font-mono" style={{ color: getRiskColor(value) }}>
                          {value}
                        </span>
                      </div>
                      <div
                        className="rounded-full overflow-hidden"
                        style={{ height: 4, background: '#1e293b' }}
                      >
                        <div
                          className="rounded-full"
                          style={{
                            height: '100%',
                            width: `${value}%`,
                            background: getRiskColor(value),
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ESG Score */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold mb-3" style={{ color: '#22c55e' }}>
                  🌱 ESG Score
                </h4>
                <div className="rounded-lg p-3" style={{ background: '#142030' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#f1f5f9' }}>
                      Overall
                    </span>
                    <span
                      className="text-lg font-bold font-mono"
                      style={{
                        color:
                          selectedCountry.esgScore >= 70
                            ? '#22c55e'
                            : selectedCountry.esgScore >= 50
                            ? '#eab308'
                            : '#ef4444',
                      }}
                    >
                      {selectedCountry.esgScore}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Companies */}
              <div>
                <h4 className="text-xs font-semibold mb-3" style={{ color: '#d4a017' }}>
                  🏢 Top Companies
                </h4>
                <div className="flex flex-col gap-1.5">
                  {selectedCountry.topCompanies.slice(0, 5).map((company) => (
                    <div
                      key={company}
                      className="rounded-lg px-3 py-2 text-xs"
                      style={{ background: '#142030', color: '#94a3b8' }}
                    >
                      {company}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getRiskColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#22c55e';
  return '#14b8a6';
}

function getRiskColorAlpha(score: number, alpha: number): string {
  const hex = getRiskColor(score);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCompositeRisk(country: { riskFactors: Record<string, number> }): number {
  const values = Object.values(country.riskFactors);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M tons`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k tons`;
  return `${volume} tons`;
}
