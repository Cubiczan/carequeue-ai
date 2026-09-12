/**
 * MineScope — Root Application Component
 * 
 * Main app shell with:
 * - Dark theme configuration
 * - Tab-based navigation rendering
 * - Component lazy loading structure
 * 
 * Root application component for MineScope.
 * 
 * This component serves as the root of the application, orchestrating
 * all dashboard sections.
 */

'use client';

import React, { useState } from 'react';

// ─── Import Generated Components ───────────────────────────────────────────
// Dashboard components

import Dashboard from './components/Dashboard';
import PriceTracker from './components/PriceTracker';
import SupplyChainMap from './components/SupplyChainMap';
import RiskScorecard from './components/RiskScorecard';
import MineralReserves from './components/MineralReserves';
import CompanyComparison from './components/CompanyComparison';
import ESGTracker from './components/ESGTracker';
import ProspectivityExplorer from './components/ProspectivityExplorer';

// ─── Navigation Configuration ──────────────────────────────────────────────

interface Tab {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', component: Dashboard },
  { id: 'prices', label: 'Price Tracker', icon: '📈', component: PriceTracker },
  { id: 'supply-chain', label: 'Supply Chain Map', icon: '🗺️', component: SupplyChainMap },
  { id: 'risk', label: 'Risk Analysis', icon: '⚠️', component: RiskScorecard },
  { id: 'prospectivity', label: 'Prospectivity', icon: '🎯', component: ProspectivityExplorer },
  { id: 'reserves', label: 'Reserves', icon: '📦', component: MineralReserves },
  { id: 'companies', label: 'Companies', icon: '🏢', component: CompanyComparison },
  { id: 'esg', label: 'ESG', icon: '🌱', component: ESGTracker },
];

// ─── App Component ─────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component ?? Dashboard;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050a15',
        color: '#f1f5f9',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* ─── Global Header ─── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: 'linear-gradient(180deg, #0d1520, #0d1520e0)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1e293b',
        }}
      >
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
            }}
          >
            <span style={{ fontSize: 18 }}>⛏️</span>
          </div>
          <div>
            <h1
              className="text-base font-bold tracking-tight"
              style={{ color: '#f1f5f9' }}
            >
              MineScope
            </h1>
            <p className="text-xs" style={{ color: '#64748b' }}>
              Critical Mineral Supply Chain Intelligence
            </p>
          </div>
        </div>

        <div
          className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{ background: '#14b8a620', border: '1px solid #14b8a640' }}
        >
          <span className="text-xs" style={{ color: '#14b8a6' }}>React</span>
          <span className="text-xs" style={{ color: '#64748b' }}>·</span>
          <span className="text-xs" style={{ color: '#14b8a6' }}>TypeScript</span>
          <span className="text-xs" style={{ color: '#64748b' }}>·</span>
          <span className="text-xs" style={{ color: '#14b8a6' }}>D3.js</span>
        </div>
      </header>

      {/* ─── Tab Navigation ─── */}
      <nav
        className="sticky top-[60px] z-40 flex items-center gap-1 px-6 py-2 overflow-x-auto"
        style={{
          background: '#0d1520',
          borderBottom: '1px solid #1e293b',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: activeTab === tab.id ? '#14b8a6' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#94a3b8',
            }}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ─── Main Content ─── */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
        <ActiveComponent />
      </main>

      {/* ─── Footer ─── */}
      <footer
        className="px-6 py-4 mt-8"
        style={{ borderTop: '1px solid #1e293b' }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs" style={{ color: '#334155' }}>
            © 2026 MineScope · React + TypeScript
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs" style={{ color: '#334155' }}>
              #OpenSource
            </span>
            <span className="text-xs" style={{ color: '#334155' }}>
              Data: USGS · IEA · World Bank
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
