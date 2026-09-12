/**
 * MineScope — Company Comparison Component
 * 
 * Side-by-side mining company comparison with:
 * - Search bar with autocomplete
 * - Company metric cards (production, reserves, ESG, market cap)
 * - Sortable comparison table with "better" indicators
 * - Radar chart comparison overlay
 * 
 * Side-by-side mining company comparison with search and sortable tables.
 */

'use client';

import React, { useState, useMemo } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface MiningCompany {
  id: string;
  name: string;
  ticker: string;
  country: string;
  flag: string;
  primaryMinerals: string[];
  metrics: {
    marketCap: number;       // USD billions
    revenue: number;         // USD billions
    employees: number;
    esgScore: number;
    lithiumProduction: number;
    cobaltProduction: number;
    nickelProduction: number;
    copperProduction: number;
  };
}

// ─── Mock Company Data ────────────────────────────────────────────────────

const COMPANIES: MiningCompany[] = [
  {
    id: 'albemarle',
    name: 'Albemarle',
    ticker: 'ALB',
    country: 'USA',
    flag: '🇺🇸',
    primaryMinerals: ['Lithium', 'Bromine'],
    metrics: {
      marketCap: 12.8,
      revenue: 7.1,
      employees: 6500,
      esgScore: 78,
      lithiumProduction: 45000,
      cobaltProduction: 0,
      nickelProduction: 0,
      copperProduction: 0,
    },
  },
  {
    id: 'glencore',
    name: 'Glencore',
    ticker: 'GLEN',
    country: 'Switzerland',
    flag: '🇨🇭',
    primaryMinerals: ['Copper', 'Cobalt', 'Coal', 'Zinc'],
    metrics: {
      marketCap: 68.2,
      revenue: 217.0,
      employees: 135000,
      esgScore: 52,
      lithiumProduction: 0,
      cobaltProduction: 25000,
      nickelProduction: 42000,
      copperProduction: 1050000,
    },
  },
  {
    id: 'bhp',
    name: 'BHP Group',
    ticker: 'BHP',
    country: 'Australia',
    flag: '🇦🇺',
    primaryMinerals: ['Copper', 'Iron Ore', 'Nickel'],
    metrics: {
      marketCap: 148.5,
      revenue: 53.8,
      employees: 45000,
      esgScore: 82,
      lithiumProduction: 0,
      cobaltProduction: 0,
      nickelProduction: 80000,
      copperProduction: 1700000,
    },
  },
  {
    id: 'cmoc',
    name: 'CMOC Group',
    ticker: '603993',
    country: 'China',
    flag: '🇨🇳',
    primaryMinerals: ['Copper', 'Cobalt'],
    metrics: {
      marketCap: 22.1,
      revenue: 26.3,
      employees: 28000,
      esgScore: 48,
      lithiumProduction: 0,
      cobaltProduction: 55000,
      nickelProduction: 0,
      copperProduction: 590000,
    },
  },
  {
    id: 'sqm',
    name: 'SQM',
    ticker: 'SQM',
    country: 'Chile',
    flag: '🇨🇱',
    primaryMinerals: ['Lithium', 'Iodine', 'Potash'],
    metrics: {
      marketCap: 8.5,
      revenue: 6.2,
      employees: 8200,
      esgScore: 65,
      lithiumProduction: 52000,
      cobaltProduction: 0,
      nickelProduction: 0,
      copperProduction: 0,
    },
  },
  {
    id: 'pilbara',
    name: 'Pilbara Minerals',
    ticker: 'PLS',
    country: 'Australia',
    flag: '🇦🇺',
    primaryMinerals: ['Lithium', 'Tantalum'],
    metrics: {
      marketCap: 6.2,
      revenue: 2.8,
      employees: 1200,
      esgScore: 75,
      lithiumProduction: 56000,
      cobaltProduction: 0,
      nickelProduction: 0,
      copperProduction: 0,
    },
  },
  {
    id: 'rio-tinto',
    name: 'Rio Tinto',
    ticker: 'RIO',
    country: 'UK',
    flag: '🇬🇧',
    primaryMinerals: ['Copper', 'Iron Ore', 'Aluminum', 'Lithium'],
    metrics: {
      marketCap: 102.3,
      revenue: 51.8,
      employees: 57000,
      esgScore: 79,
      lithiumProduction: 8000,
      cobaltProduction: 0,
      nickelProduction: 0,
      copperProduction: 530000,
    },
  },
  {
    id: 'first-quantum',
    name: 'First Quantum Minerals',
    ticker: 'FM',
    country: 'Canada',
    flag: '🇨🇦',
    primaryMinerals: ['Copper', 'Gold', 'Nickel'],
    metrics: {
      marketCap: 9.8,
      revenue: 7.2,
      employees: 20000,
      esgScore: 58,
      lithiumProduction: 0,
      cobaltProduction: 0,
      nickelProduction: 25000,
      copperProduction: 756000,
    },
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function CompanyComparison() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([
    'albemarle',
    'glencore',
    'bhp',
  ]);
  const [sortField, setSortField] = useState<string>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Filter companies by search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return COMPANIES;
    const q = searchQuery.toLowerCase();
    return COMPANIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.ticker.toLowerCase().includes(q) ||
        c.primaryMinerals.some((m) => m.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const activeCompanies = COMPANIES.filter((c) =>
    selectedCompanies.includes(c.id)
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const addCompany = (id: string) => {
    if (selectedCompanies.length < 5 && !selectedCompanies.includes(id)) {
      setSelectedCompanies([...selectedCompanies, id]);
    }
  };

  const removeCompany = (id: string) => {
    setSelectedCompanies(selectedCompanies.filter((c) => c !== id));
  };

  const sortedActive = [...activeCompanies].sort((a, b) => {
    const aVal = (a.metrics as any)[sortField] ?? 0;
    const bVal = (b.metrics as any)[sortField] ?? 0;
    return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  return (
    <div style={{ color: '#f1f5f9' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
            🏢 Company Comparison
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Compare mining companies across key metrics (up to 5)
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: '#14b8a6', color: '#fff' }}
        >
          📤 Export Comparison
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ background: '#142030', border: '1px solid #1e293b' }}
        >
          <span style={{ color: '#64748b' }}>🔍</span>
          <input
            type="text"
            placeholder="Search companies by name, ticker, or mineral..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: '#f1f5f9' }}
          />
        </div>

        {/* Autocomplete Dropdown */}
        {searchQuery && filteredCompanies.length > 0 && (
          <div
            className="absolute z-10 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-64 overflow-y-auto"
            style={{ background: '#142030', border: '1px solid #1e293b' }}
          >
            {filteredCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => {
                  addCompany(company.id);
                  setSearchQuery('');
                }}
                className="flex items-center justify-between w-full px-4 py-3 text-left transition-colors"
                style={{ borderBottom: '1px solid #0f172a' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1a2940')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center gap-2">
                  <span>{company.flag}</span>
                  <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                    {company.name}
                  </span>
                  <span className="text-xs" style={{ color: '#64748b' }}>
                    {company.ticker}
                  </span>
                </div>
                <div className="flex gap-1">
                  {company.primaryMinerals.slice(0, 2).map((m) => (
                    <span
                      key={m}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: '#1e293b', color: '#64748b' }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Company Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {activeCompanies.map((company) => (
          <div
            key={company.id}
            className="rounded-xl p-4 relative"
            style={{
              background: '#0d1520',
              border: '1px solid #14b8a640',
            }}
          >
            <button
              onClick={() => removeCompany(company.id)}
              className="absolute top-2 right-2 text-xs"
              style={{ color: '#64748b' }}
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: 20 }}>{company.flag}</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
                  {company.name}
                </div>
                <div className="text-xs" style={{ color: '#64748b' }}>
                  {company.ticker} · {company.country}
                </div>
              </div>
            </div>
            <div className="text-xs" style={{ color: '#475569' }}>
              {company.primaryMinerals.join(', ')}
            </div>
          </div>
        ))}

        {/* Add Company Card */}
        {selectedCompanies.length < 5 && (
          <button
            onClick={() => document.querySelector('input')?.focus()}
            className="rounded-xl p-4 flex items-center justify-center transition-colors"
            style={{
              background: '#0d1520',
              border: '2px dashed #1e293b',
              minHeight: '88px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#14b8a640')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
          >
            <span className="text-sm" style={{ color: '#64748b' }}>
              + Add Company
            </span>
          </button>
        )}
      </div>

      {/* ─── Comparison Table ─── */}
      {activeCompanies.length >= 2 && (
        <div className="rounded-xl overflow-hidden mb-6" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>
                    Metric
                  </th>
                  {sortedActive.map((c) => (
                    <th
                      key={c.id}
                      className="text-center px-4 py-3 text-xs font-medium"
                      style={{ color: '#f1f5f9' }}
                    >
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'marketCap', label: 'Market Cap', format: (v: number) => `$${v.toFixed(1)}B`, higher: true },
                  { key: 'revenue', label: 'Revenue', format: (v: number) => `$${v.toFixed(1)}B`, higher: true },
                  { key: 'employees', label: 'Employees', format: (v: number) => v.toLocaleString(), higher: false },
                  { key: 'esgScore', label: 'ESG Score', format: (v: number) => `${v}/100`, higher: true },
                  { key: 'lithiumProduction', label: 'Li Production', format: (v: number) => v > 0 ? `${(v / 1000).toFixed(0)}k t` : '—', higher: true },
                  { key: 'cobaltProduction', label: 'Co Production', format: (v: number) => v > 0 ? `${(v / 1000).toFixed(0)}k t` : '—', higher: true },
                  { key: 'nickelProduction', label: 'Ni Production', format: (v: number) => v > 0 ? `${(v / 1000).toFixed(0)}k t` : '—', higher: true },
                  { key: 'copperProduction', label: 'Cu Production', format: (v: number) => v > 0 ? `${(v / 1000).toFixed(0)}k t` : '—', higher: true },
                ].map((row) => {
                  const values = sortedActive.map((c) => (c.metrics as any)[row.key] ?? 0);
                  const bestIdx = row.higher
                    ? values.indexOf(Math.max(...values))
                    : values.indexOf(Math.min(...values.filter((v) => v > 0)));

                  return (
                    <tr
                      key={row.key}
                      className="cursor-pointer"
                      style={{ borderBottom: '1px solid #0f172a' }}
                      onClick={() => handleSort(row.key)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#142030')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium" style={{ color: '#f1f5f9' }}>
                            {row.label}
                          </span>
                          {sortField === row.key && (
                            <span className="text-xs" style={{ color: '#64748b' }}>
                              {sortDir === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </td>
                      {sortedActive.map((c, idx) => {
                        const val = (c.metrics as any)[row.key] ?? 0;
                        const isBest = idx === bestIdx && val > 0;
                        return (
                          <td
                            key={c.id}
                            className="text-center px-4 py-3"
                          >
                            <span
                              className="text-sm font-mono"
                              style={{
                                color: isBest ? '#22c55e' : '#94a3b8',
                                fontWeight: isBest ? 700 : 400,
                              }}
                            >
                              {row.format(val)}
                              {isBest && ' ✓'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
