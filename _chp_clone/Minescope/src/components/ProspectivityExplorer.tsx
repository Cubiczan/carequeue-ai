'use client';

import React, { useMemo, useState } from 'react';
import mineralsData from '../data/minerals.json';
import prospectivityZones from '../data/prospectivity-zones.json';
import {
  ProspectivityZone,
  rankProspectivityZones,
} from '../utils/prospectivity-scoring';

const evidenceLabels = {
  geology: 'Geology',
  geochemistry: 'Geochemistry',
  geophysics: 'Geophysics',
  infrastructure: 'Infrastructure',
  policy: 'Policy',
};

export default function ProspectivityExplorer() {
  const [mineralFilter, setMineralFilter] = useState('all');
  const rankedZones = useMemo(
    () => rankProspectivityZones(prospectivityZones as ProspectivityZone[]),
    []
  );
  const visibleZones = rankedZones.filter((zone) =>
    mineralFilter === 'all' || zone.mineralId === mineralFilter
  );

  return (
    <div style={{ color: '#f1f5f9' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
            Prospectivity Explorer
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Explainable target-zone ranking for critical mineral exploration
          </p>
        </div>
        <select
          value={mineralFilter}
          onChange={(event) => setMineralFilter(event.target.value)}
          className="rounded-lg px-3 py-2 text-xs outline-none"
          style={{ background: '#142030', color: '#f1f5f9', border: '1px solid #1e293b' }}
        >
          <option value="all">All Minerals</option>
          {mineralsData.map((mineral) => (
            <option key={mineral.id} value={mineral.id}>
              {mineral.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {visibleZones.slice(0, 3).map((zone) => (
          <div
            key={zone.id}
            className="rounded-xl p-5"
            style={{ background: '#0d1520', border: '1px solid #1e293b' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{zone.name}</p>
                <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                  {zone.region}, {zone.country}
                </p>
              </div>
              <span
                className="rounded-full px-2 py-1 text-xs font-bold"
                style={{ background: `${zone.color}20`, color: zone.color }}
              >
                {zone.score}
              </span>
            </div>
            <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>{zone.rationale}</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span style={{ color: '#64748b' }}>Class</span>
              <span style={{ color: zone.color, fontWeight: 700 }}>{zone.className}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span style={{ color: '#64748b' }}>Limiting factor</span>
              <span style={{ color: '#f1f5f9' }}>{evidenceLabels[zone.limitingFactor]}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#0d1520', border: '1px solid #1e293b' }}>
        <div className="p-4" style={{ borderBottom: '1px solid #1e293b' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
            Evidence-layer ranking
          </h3>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>
            Score = weighted geology, geochemistry, geophysics, infrastructure, policy, and model confidence.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>Zone</th>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>Deposit model</th>
                <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#64748b' }}>Confidence</th>
                <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#14b8a6' }}>Prospectivity</th>
              </tr>
            </thead>
            <tbody>
              {visibleZones.map((zone) => (
                <tr key={zone.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{zone.name}</p>
                    <p className="text-xs mt-1" style={{ color: '#64748b' }}>{zone.country}</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>{zone.depositModel}</td>
                  <td className="px-4 py-3 text-center text-sm font-mono" style={{ color: '#f1f5f9' }}>
                    {zone.confidence}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: `${zone.color}20`, color: zone.color }}>
                      {zone.score} {zone.className}
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
