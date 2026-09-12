"use client";

/**
 * Fee-Sharing Dashboard — Oracle Signal Provider Earnings
 *
 * Shows real-time fee earnings breakdown for oracle signal providers,
 * including reputation-based tier distribution, claim history,
 * and partner revenue statistics.
 */

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Coins,
  TrendingUp,
  Gift,
  ArrowUpRight,
  Download,
  RefreshCw,
  Loader2,
  Shield,
  Zap,
  CircleDollarSign,
  Trophy,
  Award,
  Star,
  Crown,
  Medal,
} from "lucide-react";

// Types
interface ClaimerBreakdown {
  wallet: string;
  label?: string;
  earned: number;
  claimed: number;
  unclaimed: number;
}

interface RecentClaim {
  txSignature: string;
  amount: number;
  token: string;
  claimer: string;
  timestamp: string;
}

interface FeeData {
  totalFeesEarned: number;
  totalFeesClaimed: number;
  totalFeesUnclaimed: number;
  lifetimeFees: number;
  claimEvents: number;
  feeRate: string;
  compoundingRate: string;
  recentClaims: RecentClaim[];
  claimerBreakdown: ClaimerBreakdown[];
}

interface ProviderData {
  provider: {
    wallet: string;
    agentId: string;
    reputationScore: number;
    signalsSubmitted: number;
    accuracyRate: number;
    feesEarned: number;
    feesClaimed: number;
    lastSignalAt: string;
    isActive: boolean;
  };
  shareBps: number;
  currentEarnings: number;
  pendingPayout: number;
  tier: "bronze" | "silver" | "gold" | "diamond";
}

const TIER_STYLES: Record<string, { icon: React.ElementType; color: string; badge: string }> = {
  diamond: { icon: Crown, color: "text-cyan-400", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  gold: { icon: Trophy, color: "text-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  silver: { icon: Medal, color: "text-slate-400", badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  bronze: { icon: Award, color: "text-orange-400", badge: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
};

const PIE_COLORS = ["#06B6D4", "#A855F7", "#10B981", "#F59E0B", "#F97316"];

export default function FeesPage() {
  const [feeData, setFeeData] = useState<FeeData | null>(null);
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetchFeeData();
  }, []);

  async function fetchFeeData() {
    setLoading(true);
    try {
      const res = await fetch("/api/bags/fees");
      const data = await res.json();
      if (data.success) {
        setFeeData(data.fees);
        setProviders(data.providers);
      }
    } catch (err) {
      console.error("Failed to fetch fee data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimFees() {
    setClaiming(true);
    try {
      const res = await fetch("/api/bags/fees", { method: "POST", body: JSON.stringify({ wallet: "demo_wallet" }) });
      const data = await res.json();
      if (data.success) {
        fetchFeeData();
      }
    } catch (err) {
      console.error("Claim failed:", err);
    } finally {
      setClaiming(false);
    }
  }

  const pieData = feeData?.claimerBreakdown.map((c) => ({
    name: c.label || c.wallet.slice(0, 8) + "...",
    value: c.earned,
  })) || [];

  const claimRate =
    feeData && feeData.totalFeesEarned > 0
      ? ((feeData.totalFeesClaimed / feeData.totalFeesEarned) * 100).toFixed(1)
      : "0";

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Fee-Sharing Dashboard</h1>
              <p className="text-sm text-slate-400 mt-1">
                Oracle signal provider earnings & $SWARM fee distribution
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClaimFees}
                disabled={claiming}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold hover:from-green-400 hover:to-emerald-400 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 cursor-pointer"
              >
                {claiming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Claim Fees
              </button>
              <button
                onClick={fetchFeeData}
                className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {loading && !feeData ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="ml-3 text-slate-400">Loading fee data...</span>
            </div>
          ) : (
            <>
              {/* Key Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: "Total Fees Earned",
                    value: feeData ? `${feeData.totalFeesEarned.toLocaleString()} SWARM` : "—",
                    icon: CircleDollarSign,
                    color: "text-cyan-400",
                    sub: feeData ? `≈ $${(feeData.totalFeesEarned * 0.00042).toFixed(2)}` : "",
                  },
                  {
                    label: "Fees Claimed",
                    value: feeData ? `${feeData.totalFeesClaimed.toLocaleString()} SWARM` : "—",
                    icon: Gift,
                    color: "text-green-400",
                    sub: `${claimRate}% claim rate`,
                  },
                  {
                    label: "Unclaimed",
                    value: feeData ? `${feeData.totalFeesUnclaimed.toLocaleString()} SWARM` : "—",
                    icon: Coins,
                    color: "text-amber-400",
                    sub: "Available to claim",
                  },
                  {
                    label: "Claim Events",
                    value: feeData ? feeData.claimEvents.toString() : "—",
                    icon: TrendingUp,
                    color: "text-purple-400",
                    sub: "All-time",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card p-5 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="text-lg font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                    {stat.sub && (
                      <div className="text-xs text-muted mt-0.5">{stat.sub}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                {/* Provider Earnings Bar Chart */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">Provider Earnings</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={feeData?.claimerBreakdown.map((c) => ({
                        name: (c.label || c.wallet.slice(0, 10)).split(" ").pop() || "",
                        earned: c.earned,
                        claimed: c.claimed,
                        unclaimed: c.unclaimed,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="earned" fill="#06B6D4" radius={[4, 4, 0, 0]} name="Earned" />
                      <Bar dataKey="claimed" fill="#10B981" radius={[4, 4, 0, 0]} name="Claimed" />
                      <Bar dataKey="unclaimed" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Unclaimed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Fee Distribution Pie Chart */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-white">Fee Distribution</h2>
                  </div>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={260}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {pieData.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-xs text-slate-300 truncate">{item.name}</span>
                          <span className="text-xs text-slate-500 ml-auto">
                            {item.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Oracle Signal Providers Table */}
              <div className="glass-card p-6 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">Oracle Signal Providers</h2>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Agents earn trading fees proportional to their reputation tier and signal accuracy.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-border">
                        <th className="pb-3 font-medium">Agent</th>
                        <th className="pb-3 font-medium">Tier</th>
                        <th className="pb-3 font-medium">Reputation</th>
                        <th className="pb-3 font-medium">Signals</th>
                        <th className="pb-3 font-medium">Accuracy</th>
                        <th className="pb-3 font-medium">Earned</th>
                        <th className="pb-3 font-medium">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.map(({ provider, tier, pendingPayout }) => {
                        const style = TIER_STYLES[tier];
                        const TierIcon = style.icon;
                        return (
                          <tr
                            key={provider.agentId}
                            className="border-b border-border/50 hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-3 pr-4">
                              <div className="font-medium text-white">{provider.agentId}</div>
                              <div className="text-xs text-slate-500 truncate max-w-[150px]">
                                {provider.wallet.slice(0, 20)}...
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${style.badge}`}
                              >
                                <TierIcon className="w-3 h-3" />
                                {tier.charAt(0).toUpperCase() + tier.slice(1)}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      provider.reputationScore >= 95
                                        ? "bg-cyan-500"
                                        : provider.reputationScore >= 80
                                        ? "bg-amber-500"
                                        : provider.reputationScore >= 50
                                        ? "bg-slate-400"
                                        : "bg-orange-700"
                                    }`}
                                    style={{ width: `${provider.reputationScore}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-white">
                                  {provider.reputationScore}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-slate-300">
                              {provider.signalsSubmitted.toLocaleString()}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-green-400 text-xs font-medium">
                                {(provider.accuracyRate * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-slate-300">
                              {provider.feesEarned.toLocaleString()} SWARM
                            </td>
                            <td className="py-3">
                              <span className="text-amber-400 text-xs font-medium">
                                {pendingPayout > 0 ? `+${pendingPayout.toLocaleString()}` : "0"} SWARM
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Claims */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-green-400" />
                  <h2 className="text-lg font-bold text-white">Recent Claims</h2>
                </div>

                <div className="space-y-2">
                  {feeData?.recentClaims.map((claim, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <ArrowUpRight className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {claim.amount} {claim.token}
                          </div>
                          <div className="text-xs text-slate-400">
                            {claim.claimer} &middot; {new Date(claim.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`https://solscan.io/tx/${claim.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        View TX &rarr;
                      </a>
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
