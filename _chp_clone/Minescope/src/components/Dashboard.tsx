/**
 * MineScope — Main Dashboard Component
 * 
 * Provides the primary dashboard layout with:
 * - Real-time price ticker bar
 * - Sidebar navigation (collapsible)
 * - KPI summary cards
 * - Supply Chain Spotlight section
 * - Alert feed
 * 
 * Main dashboard with dark theme, sidebar navigation, KPI cards,
 * supply chain spotlight, and alert feed.
 */

'use client';

import React, { useState } from 'react';
import mineralsData from '../data/minerals.json';

// ─── Types ─────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface KpiCard {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
  color: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'prices', label: 'Prices', icon: '📈' },
  { id: 'supply-chain', label: 'Supply Chain', icon: '🗺️' },
  { id: 'risk', label: 'Risk Analysis', icon: '⚠️', badge: 3 },
  { id: 'reserves', label: 'Reserves', icon: '📦' },
  { id: 'companies', label: 'Companies', icon: '🏢' },
  { id: 'esg', label: 'ESG', icon: '🌱' },
];

const RISK_ALERTS = [
  { severity: 'critical', title: 'REE supply risk critical', desc: 'China announces new export controls on heavy rare earths' },
  { severity: 'high', title: 'Cobalt price volatility', desc: 'DRC regulatory uncertainty driving 12% weekly price swing' },
  { severity: 'warning', title: 'Lithium demand surge', desc: 'China EV sales up 35% QoQ, lithium spot prices rising' },
  { severity: 'info', title: 'Data updated', desc: 'Commodity prices refreshed — January 15, 2025' },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Calculate KPI values from minerals data
  const avgPrice = Math.round(
    mineralsData.reduce((sum, m) => sum + m.price, 0) / mineralsData.length
  );
  const highestRiskMineral = mineralsData.reduce((max, m) =>
    m.riskScore > max.riskScore ? m : max
  );
  const avgEsg = 67.3; // Aggregated from countries data

  const kpiCards: KpiCard[] = [
    {
      label: 'Avg. Price',
      value: `$${(avgPrice / 1000).toFixed(1)}k/t`,
      change: '+2.1%',
      changeType: 'positive',
      icon: '📈',
      color: '#14b8a6',
    },
    {
      label: 'High Risk',
      value: `${highestRiskMineral.name}: ${highestRiskMineral.riskScore}`,
      change: 'View',
      changeType: 'neutral',
      icon: '⚠️',
      color: '#ef4444',
    },
    {
      label: 'Active Mines',
      value: '2,847',
      change: 'Map',
      changeType: 'neutral',
      icon: '🌍',
      color: '#3b82f6',
    },
    {
      label: 'Tracked Cos.',
      value: '156',
      change: 'List',
      changeType: 'neutral',
      icon: '🏢',
      color: '#8b5cf6',
    },
    {
      label: 'Avg. ESG',
      value: `${avgEsg}/100`,
      change: '+3.2',
      changeType: 'positive',
      icon: '🌱',
      color: '#22c55e',
    },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: '#050a15', color: '#f1f5f9' }}>
      {/* ─── Price Ticker Bar ─── */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center overflow-hidden"
        style={{
          height: '36px',
          background: 'linear-gradient(90deg, #0d1520, #142030, #0d1520)',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div className="flex animate-ticker whitespace-nowrap">
          {mineralsData.map((mineral) => (
            <div
              key={mineral.id}
              className="flex items-center gap-2 px-6 text-sm"
              style={{ borderRight: '1px solid #1e293b' }}
            >
              <span style={{ color: '#64748b' }}>{mineral.symbol}</span>
              <span style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>
                ${mineral.price.toLocaleString()}
              </span>
              <span
                style={{
                  color: mineral.changeDirection === 'up' ? '#22c55e' : '#ef4444',
                  fontSize: '12px',
                }}
              >
                {mineral.change > 0 ? '▲' : '▼'} {Math.abs(mineral.change)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Sidebar ─── */}
      <aside
        className="fixed left-0 z-40 transition-all duration-300"
        style={{
          top: '36px',
          bottom: 0,
          width: sidebarOpen ? '220px' : '60px',
          background: '#0d1520',
          borderRight: '1px solid #1e293b',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-5"
          style={{ borderBottom: '1px solid #1e293b' }}
        >
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            <span style={{ fontSize: 16 }}>⛏️</span>
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>
              MineScope
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col gap-1 p-2 mt-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 text-left w-full"
              style={{
                background: activeNav === item.id ? 'rgba(20, 184, 166, 0.1)' : 'transparent',
                color: activeNav === item.id ? '#14b8a6' : '#94a3b8',
                borderLeft: activeNav === item.id ? '3px solid #14b8a6' : '3px solid transparent',
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {sidebarOpen && (
                <span className="flex-1">{item.label}</span>
              )}
              {sidebarOpen && item.badge && (
                <span
                  className="flex items-center justify-center rounded-full text-xs font-medium"
                  style={{
                    width: 20,
                    height: 20,
                    background: '#ef4444',
                    color: '#fff',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div
          className="absolute bottom-0 left-0 right-0 p-3"
          style={{ borderTop: '1px solid #1e293b' }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm w-full transition-colors"
            style={{ color: '#64748b' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1a2940')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 18 }}>{sidebarOpen ? '◀' : '▶'}</span>
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main
        className="transition-all duration-300"
        style={{
          marginTop: '36px',
          marginLeft: sidebarOpen ? '220px' : '60px',
          padding: '24px',
        }}
      >
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
            Supply Chain Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Real-time critical mineral intelligence — Updated January 15, 2025
          </p>
        </div>

        {/* ─── KPI Summary Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {kpiCards.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl p-4 transition-all duration-200"
              style={{
                background: '#0d1520',
                border: '1px solid #1e293b',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = kpi.color;
                e.currentTarget.style.boxShadow = `0 0 20px ${kpi.color}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1e293b';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 28, height: 28, background: `${kpi.color}20` }}
                >
                  <span style={{ fontSize: 14 }}>{kpi.icon}</span>
                </div>
                <span className="text-xs" style={{ color: '#64748b' }}>
                  {kpi.label}
                </span>
              </div>
              <div className="text-lg font-bold" style={{ color: '#f1f5f9' }}>
                {kpi.value}
              </div>
              <div
                className="text-xs mt-1"
                style={{
                  color:
                    kpi.changeType === 'positive'
                      ? '#22c55e'
                      : kpi.changeType === 'negative'
                      ? '#ef4444'
                      : '#64748b',
                }}
              >
                {kpi.changeType === 'positive' ? '▲' : kpi.changeType === 'negative' ? '▼' : ''}
                {' '}{kpi.change}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Supply Chain Spotlight ─── */}
        <div className="mb-6 rounded-xl p-5" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <div className="flex items-center gap-2 mb-4">
            <span style={{ fontSize: 18 }}>🔦</span>
            <h2 className="text-lg font-semibold" style={{ color: '#f1f5f9' }}>
              Supply Chain Spotlight — Week of Jan 13, 2025
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mineralsData
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 3)
              .map((mineral, index) => (
                <div
                  key={mineral.id}
                  className="rounded-lg p-4"
                  style={{
                    background: '#142030',
                    border: `1px solid ${mineral.riskLevel === 'Critical' ? '#ef444440' : mineral.riskLevel === 'High' ? '#f9731640' : '#1e293b'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: '#d4a017' }}>
                      🥇🥈🥉'[index]
                    </span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: `${getRiskColor(mineral.riskScore)}20`,
                        color: getRiskColor(mineral.riskScore),
                      }}
                    >
                      Risk: {mineral.riskScore}/100
                    </span>
                  </div>
                  <h3 className="text-base font-semibold mb-1" style={{ color: '#f1f5f9' }}>
                    {mineral.name}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                    {getRiskDescription(mineral)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#64748b' }}>
                      Price: ${mineral.price.toLocaleString()}/t
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color: mineral.changeDirection === 'up' ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {mineral.change > 0 ? '▲' : '▼'}{Math.abs(mineral.change)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ─── Alert Feed ─── */}
        <div className="rounded-xl p-5" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 18 }}>🔔</span>
              <h2 className="text-lg font-semibold" style={{ color: '#f1f5f9' }}>
                Recent Alerts
              </h2>
            </div>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#1e293b', color: '#94a3b8' }}>
              View All
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {RISK_ALERTS.map((alert, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg p-3 transition-colors"
                style={{ background: '#142030' }}
              >
                <span className="mt-0.5 text-sm">
                  {alert.severity === 'critical'
                    ? '🔴'
                    : alert.severity === 'high'
                    ? '🟠'
                    : alert.severity === 'warning'
                    ? '🟡'
                    : '🔵'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                    {alert.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                    {alert.desc}
                  </p>
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: '#64748b' }}>
                  {i === 0 ? '2h ago' : i === 1 ? '5h ago' : i === 2 ? '1d ago' : '1d ago'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Data Sources Footer ─── */}
        <footer className="mt-6 rounded-xl p-4" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 14 }}>📚</span>
            <span className="text-xs font-medium" style={{ color: '#64748b' }}>Data Sources</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
            <p className="text-xs" style={{ color: '#475569' }}>
              Commodity Prices: LME, Fastmarkets MB, Asian Metal
            </p>
            <p className="text-xs" style={{ color: '#475569' }}>
              Production Data: USGS Mineral Commodity Summaries
            </p>
            <p className="text-xs" style={{ color: '#475569' }}>
              Risk Assessments: World Bank, Fragile States Index
            </p>
            <p className="text-xs" style={{ color: '#475569' }}>
              Company Data: Bloomberg, Reuters, SEC Filings
            </p>
            <p className="text-xs" style={{ color: '#475569' }}>
              Trade Flows: UN Comtrade, IEA Critical Minerals
            </p>
            <p className="text-xs" style={{ color: '#475569' }}>
              ESG Ratings: Sustainalytics, MSCI ESG
            </p>
          </div>
          <p className="text-xs mt-3" style={{ color: '#334155' }}>
            © 2026 MineScope · Data updated: 2025-01-15
          </p>
        </footer>
      </main>
    </div>
  );
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function getRiskColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#eab308';
  return '#22c55e';
}

function getRiskDescription(mineral: { name: string; topProducer: string; riskScore: number }): string {
  const descriptions: Record<string, string> = {
    'Rare Earth Elements': '70% supply from China + new export controls. Impacts EV motors, wind turbines, defense systems.',
    'Cobalt': 'DRC regulatory uncertainty + child labor concerns. 70% global supply from single country.',
    'Lithium': 'Price volatility + Chile water restrictions. Demand growth outpacing supply expansion.',
    'Nickel': 'Indonesia export policies reshaping supply. 55% from single source.',
    'Copper': 'Projected supply deficit by 2030. Mining investment lagging behind demand growth.',
  };
  return descriptions[mineral.name] || 'Monitor supply chain developments.';
}
