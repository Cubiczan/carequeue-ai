/**
 * MineScope — Risk Scorecard Component
 * 
 * Multi-dimensional risk assessment visualization with:
 * - Radar chart showing 6 risk factors per mineral/country
 * - Heatmap grid (minerals × countries) with color-coded cells
 * - Risk breakdown table with sortable columns
 * - HHI (Herfindahl-Hirschman Index) concentration indicators
 * 
 * Multi-dimensional risk scoring with radar charts, heatmap, and table views.
 */

'use client';

import React, { useState } from 'react';
import mineralsData from '../data/minerals.json';
import countriesData from '../data/countries.json';
import riskFactorsData from '../data/risk-factors.json';

// ─── Types ─────────────────────────────────────────────────────────────────

type ViewMode = 'radar' | 'heatmap' | 'table';

// ─── Component ─────────────────────────────────────────────────────────────

export default function RiskScorecard() {
  const [viewMode, setViewMode] = useState<ViewMode>('radar');
  const [selectedMineral, setSelectedMineral] = useState(mineralsData[0].id);

  const mineral = mineralsData.find((m) => m.id === selectedMineral)!;

  return (
    <div style={{ color: '#f1f5f9' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
            ⚠️ Risk Scorecard
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Multi-dimensional supply chain risk analysis
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: '#14b8a6', color: '#fff' }}
        >
          📤 Export Risk Report
        </button>
      </div>

      {/* Mineral Selector + View Mode */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: '#64748b' }}>Mineral:</span>
          {mineralsData.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMineral(m.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: selectedMineral === m.id ? '#14b8a620' : '#1e293b',
                color: selectedMineral === m.id ? '#14b8a6' : '#94a3b8',
                border: `1px solid ${selectedMineral === m.id ? '#14b8a640' : '#1e293b'}`,
              }}
            >
              {m.symbol} — {m.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#142030' }}>
          {(['radar', 'heatmap', 'table'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all"
              style={{
                background: viewMode === mode ? '#14b8a6' : 'transparent',
                color: viewMode === mode ? '#fff' : '#94a3b8',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Radar View ─── */}
      {viewMode === 'radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
            <h3 className="text-sm font-semibold mb-6" style={{ color: '#f1f5f9' }}>
              Risk Factor Radar — {mineral.name}
            </h3>

            {/* SVG Radar Chart */}
            <div className="flex items-center justify-center" style={{ height: '320px' }}>
              <svg viewBox="0 0 400 360" width="380" height="340">
                {/* Grid circles */}
                {[20, 40, 60, 80, 100].map((level) => (
                  <polygon
                    key={level}
                    points={getRadarPolygonPoints(level, 140, 200, 180)}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                ))}

                {/* Axis lines */}
                {riskFactorsData.categories.map((_, i) => {
                  const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                  const x = 200 + 140 * Math.cos(angle);
                  const y = 180 + 140 * Math.sin(angle);
                  return (
                    <line
                      key={i}
                      x1={200}
                      y1={180}
                      x2={x}
                      y2={y}
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Data polygon — based on mineral's top producing countries */}
                <polygon
                  points={getMineralRiskPolygon(mineral, 140, 200, 180)}
                  fill="#14b8a620"
                  stroke="#14b8a6"
                  strokeWidth="2"
                />

                {/* Data points */}
                {riskFactorsData.categories.map((cat, i) => {
                  const value = getMineralRiskValue(mineral, cat.id);
                  const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                  const r = (value / 100) * 140;
                  const x = 200 + r * Math.cos(angle);
                  const y = 180 + r * Math.sin(angle);
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="4" fill="#14b8a6" />
                      <circle cx={x} cy={y} r="7" fill="#14b8a630" />
                    </g>
                  );
                })}

                {/* Labels */}
                {riskFactorsData.categories.map((cat, i) => {
                  const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                  const x = 200 + 165 * Math.cos(angle);
                  const y = 180 + 165 * Math.sin(angle);
                  const value = getMineralRiskValue(mineral, cat.id);
                  return (
                    <text
                      key={i}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#94a3b8"
                      fontSize="11"
                    >
                      <tspan x={x} dy="-6">{cat.name.split(' ')[0]}</tspan>
                      <tspan x={x} dy="14" fill={getRiskColor(value)} fontSize="13" fontWeight="bold">
                        {value}
                      </tspan>
                    </text>
                  );
                })}

                {/* Center score */}
                <text
                  x={200}
                  y={180}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#f1f5f9"
                  fontSize="24"
                  fontWeight="bold"
                >
                  {mineral.riskScore}
                </text>
                <text
                  x={200}
                  y={200}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#64748b"
                  fontSize="10"
                >
                  COMPOSITE
                </text>
              </svg>
            </div>
          </div>

          {/* Risk Breakdown */}
          <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
              Risk Factor Breakdown — {mineral.name}
            </h3>

            <div className="flex flex-col gap-4">
              {riskFactorsData.categories.map((cat) => {
                const value = getMineralRiskValue(mineral, cat.id);
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-xs font-medium" style={{ color: '#f1f5f9' }}>
                          {cat.name}
                        </span>
                        <span className="text-xs ml-2" style={{ color: '#64748b' }}>
                          (weight: {Math.round(cat.weight * 100)}%)
                        </span>
                      </div>
                      <span
                        className="text-sm font-bold font-mono"
                        style={{ color: getRiskColor(value) }}
                      >
                        {value}
                      </span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 6, background: '#1e293b' }}>
                      <div
                        className="rounded-full transition-all duration-500"
                        style={{
                          height: '100%',
                          width: `${value}%`,
                          background: `linear-gradient(90deg, ${getRiskColor(value)}, ${getRiskColor(value)}aa)`,
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>
                      {cat.description.slice(0, 100)}...
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Risk Level Summary */}
            <div
              className="mt-6 rounded-lg p-4"
              style={{
                background: `${getRiskColor(mineral.riskScore)}10`,
                border: `1px solid ${getRiskColor(mineral.riskScore)}30`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${getRiskColor(mineral.riskScore)}30`,
                    color: getRiskColor(mineral.riskScore),
                  }}
                >
                  {mineral.riskLevel}
                </span>
                <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                  {mineral.name} — Risk Level: {mineral.riskScore}/100
                </span>
              </div>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {getRiskDescription(mineral)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Heatmap View ─── */}
      {viewMode === 'heatmap' && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <div className="p-4" style={{ borderBottom: '1px solid #1e293b' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
              Supply Chain Concentration Heatmap
            </h3>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>
              Color intensity = composite risk score. Hover for details.
            </p>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full">
              <thead>
                <tr>
                  <th
                    className="text-left px-3 py-2 text-xs font-medium sticky left-0"
                    style={{ color: '#64748b', background: '#0d1520' }}
                  >
                    Mineral
                  </th>
                  {countriesData.slice(0, 10).map((c) => (
                    <th
                      key={c.code}
                      className="px-3 py-2 text-xs font-medium text-center"
                      style={{ color: '#64748b' }}
                    >
                      {c.flag}<br />
                      <span style={{ fontSize: '10px' }}>{c.code}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mineralsData.map((mineral) => (
                  <tr key={mineral.id}>
                    <td
                      className="px-3 py-2 text-xs font-medium sticky left-0"
                      style={{ color: '#f1f5f9', background: '#0d1520' }}
                    >
                      {mineral.symbol}
                    </td>
                    {countriesData.slice(0, 10).map((country) => {
                      const hasProduction = country.minerals.includes(mineral.id);
                      const risk = hasProduction
                        ? calculateCellRisk(mineral, country)
                        : null;
                      return (
                        <td key={country.code} className="px-1 py-1 text-center">
                          <div
                            className="rounded-md flex items-center justify-center text-xs font-mono font-bold"
                            style={{
                              width: '100%',
                              height: '36px',
                              background: risk
                                ? `${getRiskColor(risk)}30`
                                : '#0f172a',
                              color: risk ? getRiskColor(risk) : '#1e293b',
                              border: `1px solid ${risk ? `${getRiskColor(risk)}40` : '#0f172a'}`,
                            }}
                            title={
                              risk
                                ? `${mineral.name} × ${country.name}: Risk ${risk}/100`
                                : 'No production'
                            }
                          >
                            {risk ?? '—'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center justify-center gap-2 p-4" style={{ borderTop: '1px solid #1e293b' }}>
            <span className="text-xs" style={{ color: '#64748b' }}>Low Risk</span>
            <div className="flex gap-0.5">
              {['#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#dc2626'].map((c) => (
                <div
                  key={c}
                  className="rounded-sm"
                  style={{ width: 24, height: 10, background: c }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: '#64748b' }}>High Risk</span>
          </div>
        </div>
      )}

      {/* ─── Table View ─── */}
      {viewMode === 'table' && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>
                    Mineral
                  </th>
                  {riskFactorsData.categories.map((cat) => (
                    <th
                      key={cat.id}
                      className="text-center px-3 py-3 text-xs font-medium"
                      style={{ color: '#64748b' }}
                    >
                      {cat.name.split(' ')[0]}
                    </th>
                  ))}
                  <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#14b8a6' }}>
                    Composite
                  </th>
                </tr>
              </thead>
              <tbody>
                {mineralsData
                  .sort((a, b) => b.riskScore - a.riskScore)
                  .map((m) => (
                    <tr
                      key={m.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid #0f172a' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#142030')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                          {m.name}
                        </span>
                      </td>
                      {riskFactorsData.categories.map((cat) => {
                        const val = getMineralRiskValue(m, cat.id);
                        return (
                          <td key={cat.id} className="text-center px-3 py-3">
                            <span className="text-sm font-mono" style={{ color: getRiskColor(val) }}>
                              {val}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-center px-4 py-3">
                        <span
                          className="inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold"
                          style={{
                            background: `${getRiskColor(m.riskScore)}20`,
                            color: getRiskColor(m.riskScore),
                          }}
                        >
                          {m.riskScore}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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

function getRadarPolygonPoints(
  level: number,
  radius: number,
  cx: number,
  cy: number
): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const r = (level / 100) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

function getMineralRiskValue(mineral: { id: string; topCountries: Array<{ country: string; share: number }> }, factorId: string): number {
  // Derive risk from mineral's top producing countries
  const country = countriesData.find((c) =>
    mineral.topCountries[0]?.country === c.name
  );
  if (!country) return 50;
  
  const factorKey = factorId === 'market_concentration' ? 'marketConcentration' :
    factorId === 'geopolitical' ? 'geopolitical' :
    factorId === 'environmental' ? 'environmental' :
    factorId === 'regulatory' ? 'regulatory' :
    factorId === 'infrastructure' ? 'infrastructure' : 'labor';

  return (country.riskFactors as Record<string, number>)[factorKey] ?? 50;
}

function getMineralRiskPolygon(
  mineral: { id: string; topCountries: Array<{ country: string; share: number }> },
  radius: number,
  cx: number,
  cy: number
): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const catId = riskFactorsData.categories[i].id;
    const value = getMineralRiskValue(mineral, catId);
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

function calculateCellRisk(mineral: { id: string; riskScore: number }, country: { riskFactors: Record<string, number> }): number {
  const countryAvg = Object.values(country.riskFactors).reduce((a, b) => a + b, 0) / 6;
  return Math.round(mineral.riskScore * 0.6 + countryAvg * 0.4);
}

function getRiskDescription(mineral: { name: string; riskLevel: string; topProducer: string }): string {
  if (mineral.riskLevel === 'Critical') {
    return `Extreme supply chain vulnerability for ${mineral.name}. Primary source (${mineral.topProducer}) faces significant geopolitical and regulatory challenges. Immediate diversification recommended.`;
  }
  if (mineral.riskLevel === 'High') {
    return `Significant supply concentration risk for ${mineral.name}. Monitor ${mineral.topProducer} policy developments and consider alternative sources.`;
  }
  return `${mineral.name} supply chain faces moderate risks. Continue monitoring market developments and maintain contingency plans.`;
}
