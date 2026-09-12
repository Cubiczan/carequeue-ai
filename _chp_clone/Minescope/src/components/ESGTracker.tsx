/**
 * MineScope — ESG Tracker Component
 * 
 * Environmental, Social, and Governance compliance tracking with:
 * - ESG score cards for individual pillars (E, S, G)
 * - ESG trend charts over time
 * - Peer benchmarking comparison
 * - Regulatory compliance status (EU CSRD, SEC, etc.)
 * 
 * ESG compliance tracking with peer benchmarking and regulatory status.
 */

'use client';

import React, { useState } from 'react';
import countriesData from '../data/countries.json';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ESGCompany {
  name: string;
  country: string;
  flag: string;
  overall: number;
  environmental: number;
  social: number;
  governance: number;
  trend: 'improving' | 'stable' | 'declining';
  regulatoryStatus: string[];
}

// ─── Mock ESG Data ─────────────────────────────────────────────────────────

const ESG_COMPANIES: ESGCompany[] = [
  {
    name: 'BHP Group',
    country: 'Australia',
    flag: '🇦🇺',
    overall: 82,
    environmental: 78,
    social: 85,
    governance: 83,
    trend: 'improving',
    regulatoryStatus: ['EU CSRD Compliant', 'TCFD Aligned', 'SEC Ready'],
  },
  {
    name: 'Albemarle',
    country: 'USA',
    flag: '🇺🇸',
    overall: 78,
    environmental: 75,
    social: 80,
    governance: 79,
    trend: 'improving',
    regulatoryStatus: ['EU CSRD Compliant', 'TCFD Aligned', 'CDP A-'],
  },
  {
    name: 'Rio Tinto',
    country: 'UK',
    flag: '🇬🇧',
    overall: 79,
    environmental: 72,
    social: 82,
    governance: 83,
    trend: 'improving',
    regulatoryStatus: ['EU CSRD Compliant', 'TCFD Aligned', 'RE100'],
  },
  {
    name: 'Glencore',
    country: 'Switzerland',
    flag: '🇨🇭',
    overall: 52,
    environmental: 42,
    social: 48,
    governance: 66,
    trend: 'stable',
    regulatoryStatus: ['EU CSRD In Progress', 'TCFD Aligned', 'Under Review'],
  },
  {
    name: 'CMOC Group',
    country: 'China',
    flag: '🇨🇳',
    overall: 48,
    environmental: 38,
    social: 45,
    governance: 61,
    trend: 'improving',
    regulatoryStatus: ['EU CSRD Pending', 'Domestic Compliant', 'Under Review'],
  },
  {
    name: 'SQM',
    country: 'Chile',
    flag: '🇨🇱',
    overall: 65,
    environmental: 58,
    social: 68,
    governance: 69,
    trend: 'stable',
    regulatoryStatus: ['EU CSRD In Progress', 'TCFD Aligned', 'CDP B'],
  },
];

const REGULATIONS = [
  { name: 'EU CSRD', fullName: 'EU Corporate Sustainability Reporting Directive', deadline: '2024-2026', status: 'Active' },
  { name: 'SEC Climate', fullName: 'SEC Climate Disclosure Rule', deadline: '2025-2026', status: 'Active' },
  { name: 'TCFD', fullName: 'Task Force on Climate-related Financial Disclosures', deadline: 'Voluntary', status: 'Standard' },
  { name: 'CDP', fullName: 'Carbon Disclosure Project', deadline: 'Annual', status: 'Active' },
  { name: 'IRMA', fullName: 'Initiative for Responsible Mining Assurance', deadline: 'Ongoing', status: 'Standard' },
  { name: 'OECD MNE', fullName: 'OECD Due Diligence Guidance for Minerals', deadline: 'Ongoing', status: 'Standard' },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function ESGTracker() {
  const [selectedCompany, setSelectedCompany] = useState(ESG_COMPANIES[0]);
  const [viewMode, setViewMode] = useState<'overview' | 'benchmark' | 'regulations'>('overview');

  return (
    <div style={{ color: '#f1f5f9' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
            🌱 ESG Tracker
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Environmental, Social & Governance compliance monitoring
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: '#14b8a6', color: '#fff' }}
        >
          📤 Export ESG Report
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 rounded-lg p-1 mb-6" style={{ background: '#142030', width: 'fit-content' }}>
        {(['overview', 'benchmark', 'regulations'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="rounded-md px-4 py-1.5 text-xs font-medium capitalize transition-all"
            style={{
              background: viewMode === mode ? '#14b8a6' : 'transparent',
              color: viewMode === mode ? '#fff' : '#94a3b8',
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* ─── Overview Mode ─── */}
      {viewMode === 'overview' && (
        <>
          {/* Company Selector */}
          <div className="flex items-center gap-2 flex-wrap mb-6">
            {ESG_COMPANIES.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedCompany(c)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all"
                style={{
                  background: selectedCompany.name === c.name ? '#14b8a620' : '#1e293b',
                  color: selectedCompany.name === c.name ? '#14b8a6' : '#94a3b8',
                  border: `1px solid ${selectedCompany.name === c.name ? '#14b8a640' : '#1e293b'}`,
                }}
              >
                <span>{c.flag}</span>
                {c.name}
              </button>
            ))}
          </div>

          {/* ESG Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Overall */}
            <div className="rounded-xl p-5" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: '#64748b' }}>Overall ESG</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: `${getScoreColor(selectedCompany.overall)}20`,
                    color: getScoreColor(selectedCompany.overall),
                  }}
                >
                  {selectedCompany.trend === 'improving' ? '↑ Improving' : selectedCompany.trend === 'declining' ? '↓ Declining' : '→ Stable'}
                </span>
              </div>
              <div
                className="text-4xl font-bold font-mono"
                style={{ color: getScoreColor(selectedCompany.overall) }}
              >
                {selectedCompany.overall}
              </div>
              <span className="text-xs" style={{ color: '#475569' }}>/ 100</span>
            </div>

            {/* Environmental */}
            <ESGPillarCard
              title="Environmental"
              emoji="🌍"
              score={selectedCompany.environmental}
              metrics={['Carbon Emissions', 'Water Usage', 'Land Rehab', 'Biodiversity']}
            />

            {/* Social */}
            <ESGPillarCard
              title="Social"
              emoji="👥"
              score={selectedCompany.social}
              metrics={['Community Relations', 'Labor Practices', 'Health & Safety', 'Diversity']}
            />

            {/* Governance */}
            <ESGPillarCard
              title="Governance"
              emoji="⚖️"
              score={selectedCompany.governance}
              metrics={['Board Independence', 'Anti-Corruption', 'Transparency', 'Compliance']}
            />
          </div>

          {/* Trend Chart */}
          <div className="rounded-xl p-6 mb-6" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
              📊 ESG Score Trend — {selectedCompany.name}
            </h3>

            <div className="relative" style={{ height: '200px' }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0"
                  style={{ top: `${i * 25}%`, borderBottom: '1px solid #1e293b' }}
                />
              ))}
              {/* Y-axis */}
              <div className="absolute flex flex-col justify-between" style={{ left: 0, height: '200px', fontSize: '10px', color: '#64748b' }}>
                <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
              </div>

              {/* Simulated trend line */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ left: 30, right: 0 }}>
                <defs>
                  <linearGradient id="esgTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 55 L 17 50 L 33 45 L 50 38 L 67 32 L 83 25 L 100 18 L 100 100 L 0 100 Z"
                  fill="url(#esgTrendGrad)"
                />
                <path
                  d="M 0 55 L 17 50 L 33 45 L 50 38 L 67 32 L 83 25 L 100 18"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="0.5"
                />
              </svg>

              <div className="absolute flex justify-between" style={{ bottom: -20, left: 30, right: 0 }}>
                {['2020', '2021', '2022', '2023', '2024', '2025'].map((y) => (
                  <span key={y} className="text-xs" style={{ color: '#64748b' }}>{y}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Regulatory Status */}
          <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
              📋 Regulatory Compliance — {selectedCompany.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {selectedCompany.regulatoryStatus.map((status) => {
                const isCompliant = status.includes('Compliant') || status.includes('Aligned') || status.includes('A-');
                const isPending = status.includes('In Progress') || status.includes('Pending') || status.includes('Review');
                return (
                  <div
                    key={status}
                    className="rounded-lg p-3 flex items-center gap-2"
                    style={{
                      background: '#142030',
                      border: `1px solid ${isCompliant ? '#22c55e30' : isPending ? '#eab30830' : '#ef444430'}`,
                    }}
                  >
                    <span>{isCompliant ? '✅' : isPending ? '⏳' : '⚠️'}</span>
                    <span className="text-xs font-medium" style={{ color: '#f1f5f9' }}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ─── Benchmark Mode ─── */}
      {viewMode === 'benchmark' && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <div className="p-4" style={{ borderBottom: '1px solid #1e293b' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
              📊 ESG Peer Benchmarking
            </h3>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>
              Compare ESG scores across mining companies
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>Company</th>
                  <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#22c55e' }}>Environmental</th>
                  <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#3b82f6' }}>Social</th>
                  <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#f59e0b' }}>Governance</th>
                  <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#14b8a6' }}>Overall</th>
                  <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {ESG_COMPANIES.sort((a, b) => b.overall - a.overall).map((company) => (
                  <tr
                    key={company.name}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid #0f172a' }}
                    onClick={() => { setSelectedCompany(company); setViewMode('overview'); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#142030')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{company.flag}</span>
                        <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{company.name}</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3">
                      <ESGBar value={company.environmental} color="#22c55e" />
                    </td>
                    <td className="text-center px-4 py-3">
                      <ESGBar value={company.social} color="#3b82f6" />
                    </td>
                    <td className="text-center px-4 py-3">
                      <ESGBar value={company.governance} color="#f59e0b" />
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className="text-sm font-bold font-mono" style={{ color: getScoreColor(company.overall) }}>
                        {company.overall}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className="text-xs" style={{ color: company.trend === 'improving' ? '#22c55e' : company.trend === 'declining' ? '#ef4444' : '#eab308' }}>
                        {company.trend === 'improving' ? '↑' : company.trend === 'declining' ? '↓' : '→'} {company.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Regulations Mode ─── */}
      {viewMode === 'regulations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REGULATIONS.map((reg) => (
            <div
              key={reg.name}
              className="rounded-xl p-5"
              style={{ background: '#0d1520', border: '1px solid #1e293b' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>
                  {reg.name}
                </h4>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: reg.status === 'Active' ? '#22c55e20' : '#3b82f620',
                    color: reg.status === 'Active' ? '#22c55e' : '#3b82f6',
                  }}
                >
                  {reg.status}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>{reg.fullName}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#64748b' }}>Deadline:</span>
                <span className="text-xs font-medium" style={{ color: '#f1f5f9' }}>{reg.deadline}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ESGPillarCard({
  title,
  emoji,
  score,
  metrics,
}: {
  title: string;
  emoji: string;
  score: number;
  metrics: string[];
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <span className="text-xs font-medium" style={{ color: '#64748b' }}>{title}</span>
      </div>
      <div className="text-3xl font-bold font-mono" style={{ color: getScoreColor(score) }}>
        {score}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {metrics.map((m) => (
          <div key={m} className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: '#475569' }}>•</span>
            <span className="text-xs" style={{ color: '#94a3b8' }}>{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ESGBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-full overflow-hidden" style={{ width: 80, height: 6, background: '#1e293b' }}>
        <div
          className="rounded-full h-full"
          style={{ width: `${value}%`, background: color, transition: 'width 0.5s ease' }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}
