"use client";

/**
 * $SWARM Token Page — Bags Integration
 *
 * Displays the $SWARM token on the Bags platform with:
 * - Bonding curve progress visualization
 * - Live price chart (24h history)
 * - Token launch status and Bags integration details
 * - Trading volume and holder stats
 * - Fee-sharing model breakdown
 * - Quick trade actions
 */

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Users,
  Activity,
  Zap,
  CircleDollarSign,
  BarChart3,
  Shield,
  Globe,
  RefreshCw,
  Loader2,
  Rocket,
  Percent,
  Layers,
} from "lucide-react";

// Types
interface BondingCurveData {
  tokenMint: string;
  priceUsd: number;
  priceSol: number;
  marketCap: number;
  poolTokens: number;
  quoteTokens: number;
  migrationThreshold: number;
  migrationProgress: number;
  isMigrated: boolean;
  volume24h: number;
  holders: number;
}

interface HistoryPoint {
  time: string;
  price: number;
  marketCap: number;
  volume: number;
}

export default function TokenPage() {
  const [bondingCurve, setBondingCurve] = useState<BondingCurveData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [chartMetric, setChartMetric] = useState<"price" | "marketCap" | "volume">("price");
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<string | null>(null);

  useEffect(() => {
    fetchTokenData();
  }, []);

  async function fetchTokenData() {
    setLoading(true);
    try {
      const res = await fetch("/api/bags/token");
      const data = await res.json();
      if (data.success) {
        setBondingCurve(data.bondingCurve);
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Failed to fetch token data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLaunchToken() {
    setLaunching(true);
    setLaunchResult(null);
    try {
      const res = await fetch("/api/bags/token", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLaunchResult(
          `$SWARM token launched successfully! Mint: ${data.data.tokenMint}`
        );
        fetchTokenData(); // Refresh
      } else {
        setLaunchResult(`Launch failed: ${data.error}`);
      }
    } catch (err: any) {
      setLaunchResult(`Error: ${err.message}`);
    } finally {
      setLaunching(false);
    }
  }

  function formatUsd(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(4)}`;
  }

  function formatNumber(value: number): string {
    return value.toLocaleString();
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">$SWARM Token</h1>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                    Live on Bags
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  SwarmFi Protocol Token — Powered by Bags SDK on Solana
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://bags.fm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
              >
                <Globe className="w-4 h-4" />
                bags.fm
              </a>
              <button
                onClick={fetchTokenData}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {loading && !bondingCurve ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="ml-3 text-slate-400">Loading token data...</span>
            </div>
          ) : (
            <>
              {/* Key Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: "Price (USD)",
                    value: bondingCurve ? `$${bondingCurve.priceUsd.toFixed(6)}` : "—",
                    icon: CircleDollarSign,
                    color: "text-cyan-400",
                  },
                  {
                    label: "Market Cap",
                    value: bondingCurve ? formatUsd(bondingCurve.marketCap) : "—",
                    icon: TrendingUp,
                    color: "text-green-400",
                  },
                  {
                    label: "24h Volume",
                    value: bondingCurve ? formatUsd(bondingCurve.volume24h) : "—",
                    icon: BarChart3,
                    color: "text-purple-400",
                  },
                  {
                    label: "Holders",
                    value: bondingCurve ? formatNumber(bondingCurve.holders) : "—",
                    icon: Users,
                    color: "text-amber-400",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card p-5 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      <span className="text-xs text-slate-500">{stat.label}</span>
                    </div>
                    <div className="text-xl font-bold text-white">{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Bonding Curve Progress + Price Chart */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                {/* Bonding Curve Progress */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-white">Bonding Curve</h2>
                  </div>

                  {bondingCurve && (
                    <div className="space-y-4">
                      {/* Progress bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400">Migration Progress</span>
                          <span className="text-sm font-bold text-cyan-400">
                            {bondingCurve.migrationProgress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000"
                            style={{ width: `${bondingCurve.migrationProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-slate-500">
                            {(bondingCurve.quoteTokens / 1e9).toFixed(1)}B / {(bondingCurve.migrationThreshold / 1e9).toFixed(0)}B
                          </span>
                          <span className="text-xs text-slate-500">
                            {bondingCurve.isMigrated ? "Migrated" : "Bonding Phase"}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3">
                        {[
                          { label: "Price (SOL)", value: bondingCurve.priceSol.toFixed(8) },
                          { label: "Pool Tokens", value: formatNumber(bondingCurve.poolTokens) },
                          { label: "Quote Tokens", value: formatNumber(bondingCurve.quoteTokens) },
                          { label: "Fee Rate", value: "2% (1%/1% split)" },
                          { label: "Post-Migration", value: "Meteora DAMM V2" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between py-1">
                            <span className="text-xs text-slate-400">{item.label}</span>
                            <span className="text-sm font-medium text-white">{item.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Launch button */}
                      <button
                        onClick={handleLaunchToken}
                        disabled={launching}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-semibold hover:from-cyan-400 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
                      >
                        {launching ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Launching...
                          </>
                        ) : (
                          <>
                            <Rocket className="w-4 h-4" />
                            Launch $SWARM on Bags
                          </>
                        )}
                      </button>
                      {launchResult && (
                        <p className={`text-xs mt-2 ${launchResult.includes("successfully") ? "text-green-400" : "text-red-400"}`}>
                          {launchResult}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Price Chart */}
                <div className="lg:col-span-2 glass-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">Price History</h2>
                      <p className="text-sm text-slate-400">24-hour bonding curve</p>
                    </div>
                    <div className="flex gap-1">
                      {(["price", "marketCap", "volume"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setChartMetric(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            chartMetric === m
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {m === "price" ? "Price" : m === "marketCap" ? "MCap" : "Volume"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="mcapGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={(v: number) =>
                          chartMetric === "price"
                            ? `$${v.toFixed(4)}`
                            : chartMetric === "volume"
                            ? `$${(v / 1000).toFixed(0)}K`
                            : `$${(v / 1_000_000).toFixed(1)}M`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                          fontSize: "12px",
                        }}
                        formatter={(value: any) => [
                          chartMetric === "price"
                            ? `$${value.toFixed(6)}`
                            : formatUsd(value),
                          chartMetric === "price"
                            ? "Price"
                            : chartMetric === "marketCap"
                            ? "Market Cap"
                            : "Volume",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey={chartMetric}
                        stroke={
                          chartMetric === "price"
                            ? "#06B6D4"
                            : chartMetric === "marketCap"
                            ? "#A855F7"
                            : "#F59E0B"
                        }
                        strokeWidth={2}
                        fill={
                          chartMetric === "price"
                            ? "url(#priceGrad)"
                            : chartMetric === "marketCap"
                            ? "url(#mcapGrad)"
                            : "url(#volGrad)"
                        }
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Fee-Sharing Model + Token Details */}
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                {/* Fee-Sharing Breakdown */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Percent className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-bold text-white">Fee-Sharing Model</h2>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    Every $SWARM trade generates a 2% fee, distributed across protocol participants:
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        label: "Bags Protocol",
                        bps: 5000,
                        pct: "50%",
                        color: "from-blue-500 to-blue-400",
                        bg: "bg-blue-500",
                        desc: "Platform infrastructure & maintenance",
                      },
                      {
                        label: "SwarmFi Treasury",
                        bps: 3000,
                        pct: "30%",
                        color: "from-cyan-500 to-purple-400",
                        bg: "bg-gradient-to-r from-cyan-500 to-purple-500",
                        desc: "Protocol development & operations",
                      },
                      {
                        label: "Oracle Signal Providers",
                        bps: 1500,
                        pct: "15%",
                        color: "from-green-500 to-emerald-400",
                        bg: "bg-green-500",
                        desc: "Distributed by reputation tier to agent operators",
                      },
                      {
                        label: "Ecosystem Growth",
                        bps: 500,
                        pct: "5%",
                        color: "from-amber-500 to-orange-400",
                        bg: "bg-amber-500",
                        desc: "Community incentives & grants",
                      },
                    ].map((fee) => (
                      <div key={fee.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{fee.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{fee.desc}</span>
                            <span className="text-sm font-bold text-white">{fee.pct}</span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${fee.color}`}
                            style={{ width: `${fee.bps / 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Oracle Provider Tiers */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">Signal Provider Tiers</h2>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    Oracle agents earn fees based on their reputation score and signal accuracy:
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        tier: "Diamond",
                        reputation: "95+",
                        share: "50%",
                        bps: 5000,
                        color: "bg-cyan-400 text-cyan-950 border-cyan-400/30",
                        agents: "Top-tier price & consensus agents",
                      },
                      {
                        tier: "Gold",
                        reputation: "80-94",
                        share: "30%",
                        bps: 3000,
                        color: "bg-amber-400 text-amber-950 border-amber-400/30",
                        agents: "Experienced DEX & news agents",
                      },
                      {
                        tier: "Silver",
                        reputation: "50-79",
                        share: "15%",
                        bps: 1500,
                        color: "bg-slate-400 text-slate-950 border-slate-400/30",
                        agents: "Rising sentiment agents",
                      },
                      {
                        tier: "Bronze",
                        reputation: "0-49",
                        share: "5%",
                        bps: 500,
                        color: "bg-orange-700 text-orange-100 border-orange-700/30",
                        agents: "New agents building reputation",
                      },
                    ].map((t) => (
                      <div
                        key={t.tier}
                        className={`p-3 rounded-lg border ${t.color} bg-opacity-10`}
                        style={{ backgroundColor: "transparent" }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${t.color.split(" ").slice(0, 2).join(" ")}`}>
                              {t.tier}
                            </span>
                            <div>
                              <span className="text-sm font-medium text-white">Rep: {t.reputation}</span>
                              <span className="text-xs text-slate-400 ml-2">{t.agents}</span>
                            </div>
                          </div>
                          <span className="text-lg font-bold">{t.share}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bags Integration Info */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">Bags Platform Integration</h2>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    {
                      title: "Token Launch",
                      description:
                        "$SWARM deployed via Bags SDK with Meteora Dynamic Bonding Curve for fair initial price discovery and automatic DEX migration.",
                      tech: ["Meteora DBC", "Arweave Metadata", "Jito Bundles"],
                    },
                    {
                      title: "Fee Distribution",
                      description:
                        "On-chain fee-sharing splits 2% trading fees across protocol treasury, oracle providers (by reputation tier), and ecosystem growth.",
                      tech: ["BPS Allocation", "LUT Support", "Auto-claim"],
                    },
                    {
                      title: "Partner Revenue",
                      description:
                        "SwarmFi partner key earns 25% of fees from any token launched using SwarmFi oracle data — creating a sustainable revenue flywheel.",
                      tech: ["Partner PDA", "25% Fee Share", "On-chain"],
                    },
                  ].map((card) => (
                    <div key={card.title} className="bg-slate-800/50 rounded-lg p-4">
                      <h3 className="text-sm font-bold text-white mb-2">{card.title}</h3>
                      <p className="text-xs text-slate-400 mb-3">{card.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {card.tech.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs border border-cyan-500/20"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
