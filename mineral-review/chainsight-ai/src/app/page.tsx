'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, Shield, AlertTriangle, Zap, Eye, Brain, TrendingUp,
  Bell, ChevronDown, ChevronUp, ExternalLink, Loader2,
  RefreshCw, Wifi, Search, Filter, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Hash, Clock, Coins,
  Radio, FileSearch, Sparkles
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────
interface DashboardStats {
  totalTransactions: number
  totalAnomalies: number
  criticalAlerts: number
  unreadAlerts: number
  monitoredAddresses: number
}

interface DashboardData {
  stats: DashboardStats
  anomalyByType: { type: string; count: number }[]
  anomalyBySeverity: { severity: string; count: number }[]
  dexVolume: Record<string, number>
  recentAnomalies: AnomalyItem[]
  recentTransactions: TransactionItem[]
  hourlyVolume: Record<string, unknown>[]
}

interface AnomalyItem {
  id: string
  txId: string
  txHash: string
  type: string
  severity: string
  confidence: number
  description: string
  metadata: string
  isAnalyzed: boolean
  analyzedAt: string | null
  createdAt: string
  analysis: AIAnalysisItem | null
}

interface AIAnalysisItem {
  id: string
  anomalyId: string
  summary: string
  riskLevel: string
  recommendation: string
  rawResponse: string
  createdAt: string
}

interface TransactionItem {
  id: string
  txHash: string
  blockNumber: number
  fromAddress: string
  toAddress: string
  token: string
  amount: number
  usdValue: number
  dex: string
  txType: string
  gasUsed: number
  timestamp: string
  createdAt: string
}

interface AlertItem {
  id: string
  anomalyId: string | null
  title: string
  message: string
  severity: string
  channel: string
  isRead: boolean
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function truncateAddress(addr: string, chars = 6) {
  if (!addr) return ''
  return `${addr.slice(0, chars + 2)}...${addr.slice(-4)}`
}

function truncateHash(hash: string, chars = 10) {
  if (!hash) return ''
  return `${hash.slice(0, chars)}...`
}

function formatUSD(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`
  return `$${val.toFixed(2)}`
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatFullTime(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

function severityColor(severity: string) {
  switch (severity) {
    case 'low': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'medium': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'high': return 'bg-red-500/15 text-red-400 border-red-500/30'
    case 'critical': return 'bg-red-600/20 text-red-400 border-red-500/40'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

function severityDot(severity: string) {
  switch (severity) {
    case 'low': return 'bg-emerald-400'
    case 'medium': return 'bg-amber-400'
    case 'high': return 'bg-red-400'
    case 'critical': return 'bg-red-500 animate-pulse'
    default: return 'bg-muted-foreground'
  }
}

function riskColor(risk: string) {
  switch (risk) {
    case 'low': return 'text-emerald-400'
    case 'medium': return 'text-amber-400'
    case 'high': return 'text-red-400'
    case 'critical': return 'text-red-500'
    default: return 'text-muted-foreground'
  }
}

function riskBg(risk: string) {
  switch (risk) {
    case 'low': return 'bg-emerald-500/10 border-emerald-500/30'
    case 'medium': return 'bg-amber-500/10 border-amber-500/30'
    case 'high': return 'bg-red-500/10 border-red-500/30'
    case 'critical': return 'bg-red-600/15 border-red-500/40'
    default: return 'bg-muted border-border'
  }
}

const SEVERITY_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#dc2626']
const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const TYPE_LABELS: Record<string, string> = {
  flash_loan: 'Flash Loan',
  sandwich_attack: 'Sandwich Attack',
  whale_accumulation: 'Whale Accumulation',
  wash_trading: 'Wash Trading',
  unusual_volume: 'Unusual Volume',
  mev_extraction: 'MEV Extraction',
}

const DEX_LABELS: Record<string, string> = {
  merchant_moe: 'Merchant Moe',
  agni_finance: 'Agni Finance',
  fluxion: 'Fluxion',
  unknown: 'Unknown',
}

const TX_TYPE_LABELS: Record<string, string> = {
  swap: 'Swap',
  transfer: 'Transfer',
  flash_loan: 'Flash Loan',
  liquidity: 'Liquidity',
  bridge: 'Bridge',
}

const CHART_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

// ─── Main Component ──────────────────────────────────────────────────────
export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Anomaly Feed state
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([])
  const [anomalyPage, setAnomalyPage] = useState(1)
  const [anomalyTotalPages, setAnomalyTotalPages] = useState(1)
  const [anomalyLoading, setAnomalyLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [analyzedFilter, setAnalyzedFilter] = useState('all')

  // Transaction state
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [txPage, setTxPage] = useState(1)
  const [txTotalPages, setTxTotalPages] = useState(1)
  const [txLoading, setTxLoading] = useState(true)
  const [dexFilter, setDexFilter] = useState('all')
  const [tokenFilter, setTokenFilter] = useState('all')
  const [txTypeFilter, setTxTypeFilter] = useState('all')
  const [expandedTx, setExpandedTx] = useState<string | null>(null)

  // AI Analysis state
  const [aiAnalyses, setAiAnalyses] = useState<(AnomalyItem & { analysis: AIAnalysisItem })[]>([])
  const [aiLoading, setAiLoading] = useState(true)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)

  // Analysis dialog state
  const [analysisDialog, setAnalysisDialog] = useState<{
    open: boolean
    anomaly: AnomalyItem | null
    analysis: AIAnalysisItem | null
    loading: boolean
  }>({ open: false, anomaly: null, analysis: null, loading: false })

  // Alerts state
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [alertDialog, setAlertDialog] = useState(false)

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      const data = await res.json()
      setDashboardData(data)
      setUnreadCount(data.stats?.unreadAlerts || 0)
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch anomalies with filters
  const fetchAnomalies = useCallback(async () => {
    setAnomalyLoading(true)
    try {
      const params = new URLSearchParams({ page: anomalyPage.toString(), limit: '12' })
      if (severityFilter !== 'all') params.set('severity', severityFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (analyzedFilter !== 'all') params.set('analyzed', analyzedFilter)
      const res = await fetch(`/api/anomalies?${params}`)
      const data = await res.json()
      setAnomalies(data.anomalies || [])
      setAnomalyTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      console.error('Failed to fetch anomalies:', err)
    } finally {
      setAnomalyLoading(false)
    }
  }, [anomalyPage, severityFilter, typeFilter, analyzedFilter])

  // Fetch transactions with filters
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true)
    try {
      const params = new URLSearchParams({ page: txPage.toString(), limit: '15' })
      if (dexFilter !== 'all') params.set('dex', dexFilter)
      if (tokenFilter !== 'all') params.set('token', tokenFilter)
      if (txTypeFilter !== 'all') params.set('txType', txTypeFilter)
      const res = await fetch(`/api/transactions?${params}`)
      const data = await res.json()
      setTransactions(data.transactions || [])
      setTxTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    } finally {
      setTxLoading(false)
    }
  }, [txPage, dexFilter, tokenFilter, txTypeFilter])

  // Fetch AI analyses
  const fetchAIAnalyses = useCallback(async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/anomalies?analyzed=true&limit=50')
      const data = await res.json()
      setAiAnalyses(data.anomalies?.filter((a: AnomalyItem) => a.analysis) || [])
    } catch (err) {
      console.error('Failed to fetch AI analyses:', err)
    } finally {
      setAiLoading(false)
    }
  }, [])

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts?limit=10')
      const data = await res.json()
      setAlerts(data.alerts || [])
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    fetchAnomalies()
  }, [fetchAnomalies])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    fetchAIAnalyses()
  }, [fetchAIAnalyses])

  // Run AI Analysis
  const runAnalysis = async (anomalyId: string) => {
    setAnalysisDialog((prev) => ({ ...prev, loading: true }))
    setAnalyzingId(anomalyId)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anomalyId }),
      })
      const data = await res.json()
      if (data.analysis) {
        setAnalysisDialog((prev) => ({
          ...prev,
          analysis: data.analysis,
          loading: false,
        }))
        // Refresh relevant data
        fetchAnomalies()
        fetchDashboard()
        fetchAIAnalyses()
      }
    } catch (err) {
      console.error('Analysis failed:', err)
      setAnalysisDialog((prev) => ({ ...prev, loading: false }))
    } finally {
      setAnalyzingId(null)
    }
  }

  // Mark alert as read
  const markAlertRead = async (alertId: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      })
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, isRead: true } : a))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark alert read:', err)
    }
  }

  // Generate new analysis for unanalyzed anomaly
  const generateNewAnalysis = async () => {
    try {
      const res = await fetch('/api/anomalies?analyzed=false&limit=1')
      const data = await res.json()
      if (data.anomalies?.length > 0) {
        const anomaly = data.anomalies[0]
        runAnalysis(anomaly.id)
      }
    } catch (err) {
      console.error('Failed to find unanalyzed anomaly:', err)
    }
  }

  // Prepare chart data
  const dexChartData = dashboardData
    ? Object.entries(dashboardData.dexVolume).map(([name, value]) => ({
        name: DEX_LABELS[name] || name,
        value: Math.round(value as number),
      }))
    : []

  const severityChartData = dashboardData
    ? dashboardData.anomalyBySeverity.map((item) => ({
        name: SEVERITY_LABELS[item.severity] || item.severity,
        value: item.count,
        severity: item.severity,
      }))
    : []

  const typeChartData = dashboardData
    ? dashboardData.anomalyByType.map((item) => ({
        name: TYPE_LABELS[item.type] || item.type,
        count: item.count,
      }))
    : []

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e17]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-[#0a0e17]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center glow-green">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-foreground leading-none">
                  ChainSight AI
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  On-Chain Anomaly Detection
                </span>
              </div>
              <Badge
                variant="outline"
                className="ml-2 hidden sm:inline-flex text-[10px] font-medium bg-purple-500/10 text-purple-400 border-purple-500/30"
              >
                <Radio className="w-3 h-3 mr-1" />
                Mantle Network
              </Badge>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Live Status */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <div className="relative flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 live-pulse" />
                </div>
                <span>Live</span>
              </div>

              {/* Refresh */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setLoading(true)
                  fetchDashboard()
                }}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  fetchAlerts()
                  setAlertDialog(true)
                }}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#111827] border border-border/50 p-1 h-10">
            <TabsTrigger value="overview" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Anomalies</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="ai-analysis" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-400">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">AI Analysis</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: OVERVIEW ────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="bg-[#111827] border-border/50">
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <StatCard
                    icon={<Activity className="w-5 h-5 text-emerald-400" />}
                    label="Total Transactions (24h)"
                    value={dashboardData?.stats.totalTransactions.toLocaleString() || '0'}
                    trend="+12.5%"
                    trendUp
                    iconBg="bg-emerald-500/10"
                  />
                  <StatCard
                    icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
                    label="Active Anomalies"
                    value={dashboardData?.stats.totalAnomalies.toString() || '0'}
                    trend="+3.2%"
                    trendUp
                    iconBg="bg-amber-500/10"
                  />
                  <StatCard
                    icon={<Zap className="w-5 h-5 text-red-400" />}
                    label="Critical Alerts"
                    value={dashboardData?.stats.criticalAlerts.toString() || '0'}
                    trend="-2.1%"
                    trendUp={false}
                    iconBg="bg-red-500/10"
                  />
                  <StatCard
                    icon={<Eye className="w-5 h-5 text-cyan-400" />}
                    label="Monitored Addresses"
                    value={dashboardData?.stats.monitoredAddresses.toString() || '0'}
                    trend="+1"
                    trendUp
                    iconBg="bg-cyan-500/10"
                  />
                </>
              )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* DEX Volume Bar Chart */}
              <Card className="lg:col-span-2 bg-[#111827] border-border/50 card-glow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    Volume by DEX
                  </CardTitle>
                  <CardDescription className="text-xs">Trading volume distribution across DEXs</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dexChartData} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            tickLine={false}
                            tickFormatter={(v) => formatUSD(v as number)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontSize: '12px',
                              color: '#e2e8f0',
                            }}
                            formatter={(value: number) => [formatUSD(value), 'Volume']}
                          />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {dexChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Severity Pie Chart */}
              <Card className="bg-[#111827] border-border/50 card-glow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-amber-400" />
                    Anomaly Distribution
                  </CardTitle>
                  <CardDescription className="text-xs">By severity level</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                          <Pie
                            data={severityChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {severityChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={SEVERITY_COLORS[
                                  ['low', 'medium', 'high', 'critical'].indexOf(entry.severity)
                                ] || SEVERITY_COLORS[0]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontSize: '12px',
                              color: '#e2e8f0',
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => (
                              <span style={{ color: '#94a3b8', fontSize: '11px' }}>{value}</span>
                            )}
                          />
                        </RPieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Anomalies & Transactions */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Recent Anomalies */}
              <Card className="bg-[#111827] border-border/50 card-glow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Recent Anomalies
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                      onClick={() => setActiveTab('anomalies')}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="px-4 pb-4 space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/30 hover:bg-transparent">
                            <TableHead className="text-[10px] uppercase text-muted-foreground">Severity</TableHead>
                            <TableHead className="text-[10px] uppercase text-muted-foreground">Type</TableHead>
                            <TableHead className="text-[10px] uppercase text-muted-foreground hidden sm:table-cell">Confidence</TableHead>
                            <TableHead className="text-[10px] uppercase text-muted-foreground text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dashboardData?.recentAnomalies.map((anomaly) => (
                            <TableRow key={anomaly.id} className="border-border/20">
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${severityColor(anomaly.severity)}`}>
                                  {SEVERITY_LABELS[anomaly.severity] || anomaly.severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {TYPE_LABELS[anomaly.type] || anomaly.type}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={anomaly.confidence * 100}
                                    className="h-1.5 w-16 bg-muted"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {(anomaly.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300"
                                  onClick={() =>
                                    setAnalysisDialog({
                                      open: true,
                                      anomaly,
                                      analysis: anomaly.analysis,
                                      loading: false,
                                    })
                                  }
                                >
                                  {anomaly.isAnalyzed ? 'View' : 'Analyze'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Transactions */}
              <Card className="bg-[#111827] border-border/50 card-glow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      Recent Transactions
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                      onClick={() => setActiveTab('transactions')}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="px-4 pb-4 space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/30 hover:bg-transparent">
                            <TableHead className="text-[10px] uppercase text-muted-foreground">From</TableHead>
                            <TableHead className="text-[10px] uppercase text-muted-foreground">Token</TableHead>
                            <TableHead className="text-[10px] uppercase text-muted-foreground hidden sm:table-cell">DEX</TableHead>
                            <TableHead className="text-[10px] uppercase text-muted-foreground text-right">Value</TableHead>
                            <TableHead className="text-[10px] uppercase text-muted-foreground text-right">Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dashboardData?.recentTransactions.map((tx) => (
                            <TableRow key={tx.id} className="border-border/20">
                              <TableCell>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {truncateAddress(tx.fromAddress)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] bg-muted/50">
                                  {tx.token}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <span className="text-[10px] text-muted-foreground">
                                  {DEX_LABELS[tx.dex] || tx.dex}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-xs font-medium text-foreground">
                                {formatUSD(tx.usdValue)}
                              </TableCell>
                              <TableCell className="text-right text-[10px] text-muted-foreground">
                                {formatTime(tx.timestamp)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Anomaly Types Bar Chart */}
            {typeChartData.length > 0 && (
              <Card className="bg-[#111827] border-border/50 card-glow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    Anomaly Types Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={typeChartData} layout="vertical" barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          tickLine={false}
                          width={120}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#e2e8f0',
                          }}
                        />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                          {typeChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── TAB 2: ANOMALY FEED ────────────────────────────────── */}
          <TabsContent value="anomalies" className="space-y-6 mt-6">
            {/* Filter Bar */}
            <Card className="bg-[#111827] border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Filter className="w-4 h-4" />
                    Filters:
                  </div>
                  <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setAnomalyPage(1) }}>
                    <SelectTrigger className="w-[130px] h-8 text-xs bg-[#1a1f2e] border-border/50">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setAnomalyPage(1) }}>
                    <SelectTrigger className="w-[160px] h-8 text-xs bg-[#1a1f2e] border-border/50">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="flash_loan">Flash Loan</SelectItem>
                      <SelectItem value="sandwich_attack">Sandwich Attack</SelectItem>
                      <SelectItem value="whale_accumulation">Whale Accumulation</SelectItem>
                      <SelectItem value="wash_trading">Wash Trading</SelectItem>
                      <SelectItem value="unusual_volume">Unusual Volume</SelectItem>
                      <SelectItem value="mev_extraction">MEV Extraction</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={analyzedFilter} onValueChange={(v) => { setAnalyzedFilter(v); setAnomalyPage(1) }}>
                    <SelectTrigger className="w-[130px] h-8 text-xs bg-[#1a1f2e] border-border/50">
                      <SelectValue placeholder="Analyzed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Analyzed</SelectItem>
                      <SelectItem value="false">Not Analyzed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Anomaly Cards Grid */}
            {anomalyLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="bg-[#111827] border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-8 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : anomalies.length === 0 ? (
              <Card className="bg-[#111827] border-border/50">
                <CardContent className="p-8 text-center">
                  <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No anomalies found matching filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {anomalies.map((anomaly) => (
                  <Card
                    key={anomaly.id}
                    className={`bg-[#111827] border-border/50 card-glow ${
                      anomaly.severity === 'critical' ? 'border-red-500/30' : ''
                    }`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-[10px] ${severityColor(anomaly.severity)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${severityDot(anomaly.severity)}`} />
                          {SEVERITY_LABELS[anomaly.severity]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(anomaly.createdAt)}
                        </span>
                      </div>

                      {/* Type */}
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{TYPE_LABELS[anomaly.type] || anomaly.type}</span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {anomaly.description}
                      </p>

                      {/* Confidence */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Confidence</span>
                          <span className="font-medium text-foreground">{(anomaly.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <Progress
                          value={anomaly.confidence * 100}
                          className="h-1.5 bg-muted"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {anomaly.isAnalyzed ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] flex-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            onClick={() =>
                              setAnalysisDialog({
                                open: true,
                                anomaly,
                                analysis: anomaly.analysis,
                                loading: false,
                              })
                            }
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Analysis
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] flex-1 bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20"
                            onClick={() => {
                              setAnalysisDialog({ open: true, anomaly, analysis: null, loading: true })
                              runAnalysis(anomaly.id)
                            }}
                            disabled={analyzingId === anomaly.id}
                          >
                            {analyzingId === anomaly.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Brain className="w-3 h-3 mr-1" />
                            )}
                            Run AI Analysis
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] text-muted-foreground"
                          onClick={() => window.open(`https://explorer.mantle.xyz/tx/${anomaly.txHash}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {anomalyTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={anomalyPage <= 1}
                  onClick={() => setAnomalyPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {anomalyPage} of {anomalyTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={anomalyPage >= anomalyTotalPages}
                  onClick={() => setAnomalyPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ─── TAB 3: TRANSACTIONS ────────────────────────────────── */}
          <TabsContent value="transactions" className="space-y-6 mt-6">
            {/* Filter Bar */}
            <Card className="bg-[#111827] border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Filter className="w-4 h-4" />
                    Filters:
                  </div>
                  <Select value={dexFilter} onValueChange={(v) => { setDexFilter(v); setTxPage(1) }}>
                    <SelectTrigger className="w-[150px] h-8 text-xs bg-[#1a1f2e] border-border/50">
                      <SelectValue placeholder="DEX" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All DEXs</SelectItem>
                      <SelectItem value="merchant_moe">Merchant Moe</SelectItem>
                      <SelectItem value="agni_finance">Agni Finance</SelectItem>
                      <SelectItem value="fluxion">Fluxion</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={tokenFilter} onValueChange={(v) => { setTokenFilter(v); setTxPage(1) }}>
                    <SelectTrigger className="w-[120px] h-8 text-xs bg-[#1a1f2e] border-border/50">
                      <SelectValue placeholder="Token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tokens</SelectItem>
                      <SelectItem value="MNT">MNT</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="WETH">WETH</SelectItem>
                      <SelectItem value="WBTC">WBTC</SelectItem>
                      <SelectItem value="mETH">mETH</SelectItem>
                      <SelectItem value="USDY">USDY</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={txTypeFilter} onValueChange={(v) => { setTxTypeFilter(v); setTxPage(1) }}>
                    <SelectTrigger className="w-[120px] h-8 text-xs bg-[#1a1f2e] border-border/50">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="swap">Swap</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="flash_loan">Flash Loan</SelectItem>
                      <SelectItem value="liquidity">Liquidity</SelectItem>
                      <SelectItem value="bridge">Bridge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card className="bg-[#111827] border-border/50">
              <CardContent className="p-0">
                {txLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/30 hover:bg-transparent">
                          <TableHead className="text-[10px] uppercase text-muted-foreground w-8"></TableHead>
                          <TableHead className="text-[10px] uppercase text-muted-foreground">Tx Hash</TableHead>
                          <TableHead className="text-[10px] uppercase text-muted-foreground hidden lg:table-cell">From</TableHead>
                          <TableHead className="text-[10px] uppercase text-muted-foreground hidden lg:table-cell">To</TableHead>
                          <TableHead className="text-[10px] uppercase text-muted-foreground">Token</TableHead>
                          <TableHead className="text-[10px] uppercase text-muted-foreground text-right">Amount</TableHead>
                          <TableHead className="text-[10px] uppercase text-muted-foreground text-right">USD Value</TableHead>
                          <TableHead className="text-[10px] uppercase text-muted-foreground hidden sm:table-cell">DEX</TableHead>
                          <TableHead className="text-[10px] uppercase text-muted-foreground hidden md:table-cell">Type</TableHead>
                          <TableHead className="text-[10px] uppercase text-muted-foreground text-right hidden sm:table-cell">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <React.Fragment key={tx.id}>
                            <TableRow
                              className="border-border/20 cursor-pointer hover:bg-white/[0.02]"
                              onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                            >
                              <TableCell className="w-8">
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                                    expandedTx === tx.id ? 'rotate-180' : ''
                                  }`}
                                />
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs text-emerald-400/80">
                                  {truncateHash(tx.txHash)}
                                </span>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {truncateAddress(tx.fromAddress)}
                                </span>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {truncateAddress(tx.toAddress)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] bg-muted/50">
                                  {tx.token}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-xs font-medium">
                                {tx.amount.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-xs font-medium text-emerald-400">
                                {formatUSD(tx.usdValue)}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <span className="text-[10px] text-muted-foreground">
                                  {DEX_LABELS[tx.dex] || tx.dex}
                                </span>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="secondary" className="text-[10px] bg-muted/50">
                                  {TX_TYPE_LABELS[tx.txType] || tx.txType}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-[10px] text-muted-foreground hidden sm:table-cell">
                                {formatTime(tx.timestamp)}
                              </TableCell>
                            </TableRow>
                            {/* Expanded Row */}
                            {expandedTx === tx.id && (
                              <TableRow className="border-border/20 bg-[#0d1117]">
                                <TableCell colSpan={10}>
                                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                    <div>
                                      <span className="text-muted-foreground block mb-1">Full Tx Hash</span>
                                      <span className="font-mono text-foreground break-all">{tx.txHash}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block mb-1">From Address</span>
                                      <span className="font-mono text-foreground break-all">{tx.fromAddress}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block mb-1">To Address</span>
                                      <span className="font-mono text-foreground break-all">{tx.toAddress}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block mb-1">Block Number</span>
                                      <span className="font-mono text-foreground">#{tx.blockNumber.toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block mb-1">Gas Used</span>
                                      <span className="font-mono text-foreground">{tx.gasUsed.toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block mb-1">DEX</span>
                                      <span className="text-foreground">{DEX_LABELS[tx.dex] || tx.dex}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block mb-1">USD Value</span>
                                      <span className="text-emerald-400 font-medium">{formatUSD(tx.usdValue)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block mb-1">Timestamp</span>
                                      <span className="text-foreground">{formatFullTime(tx.timestamp)}</span>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {txTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={txPage <= 1}
                  onClick={() => setTxPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {txPage} of {txTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={txPage >= txTotalPages}
                  onClick={() => setTxPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ─── TAB 4: AI ANALYSIS ────────────────────────────────── */}
          <TabsContent value="ai-analysis" className="space-y-6 mt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  AI-Powered Analysis
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Machine-generated insights and risk assessments for detected anomalies
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20"
                onClick={generateNewAnalysis}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Generate New Analysis
              </Button>
            </div>

            {/* Analysis Cards */}
            {aiLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="bg-[#111827] border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : aiAnalyses.length === 0 ? (
              <Card className="bg-[#111827] border-border/50">
                <CardContent className="p-8 text-center">
                  <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">No AI analyses generated yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30"
                    onClick={generateNewAnalysis}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Generate First Analysis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {aiAnalyses.map((item) => (
                  <Card
                    key={item.id}
                    className={`bg-[#111827] border-border/50 card-glow ${
                      item.analysis ? riskBg(item.analysis.riskLevel) : ''
                    }`}
                  >
                    <CardContent className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${severityColor(item.severity)}`}>
                            {SEVERITY_LABELS[item.severity]}
                          </Badge>
                          <span className="text-xs font-medium">
                            {TYPE_LABELS[item.type] || item.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(item.createdAt)}
                        </span>
                      </div>

                      {item.analysis && (
                        <>
                          {/* Risk Level */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Risk Level:</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                item.analysis.riskLevel === 'low'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : item.analysis.riskLevel === 'medium'
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    : item.analysis.riskLevel === 'high'
                                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                      : 'bg-red-600/20 text-red-400 border-red-500/40'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                  item.analysis.riskLevel === 'low'
                                    ? 'bg-emerald-400'
                                    : item.analysis.riskLevel === 'medium'
                                      ? 'bg-amber-400'
                                      : item.analysis.riskLevel === 'high'
                                        ? 'bg-red-400'
                                        : 'bg-red-500 animate-pulse'
                                }`}
                              />
                              {(item.analysis.riskLevel || 'medium').toUpperCase()}
                            </Badge>
                          </div>

                          <Separator className="bg-border/30" />

                          {/* Summary */}
                          <div>
                            <h4 className="text-[10px] uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                              <FileSearch className="w-3 h-3" />
                              Summary
                            </h4>
                            <p className="text-xs text-foreground/90 leading-relaxed">
                              {item.analysis.summary}
                            </p>
                          </div>

                          {/* Recommendation */}
                          <div className="bg-[#0d1117] rounded-lg p-3 border border-border/30">
                            <h4 className="text-[10px] uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Recommendation
                            </h4>
                            <p className="text-xs text-emerald-400/90 leading-relaxed">
                              {item.analysis.recommendation}
                            </p>
                          </div>

                          {/* Confidence */}
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Confidence: {(item.confidence * 100).toFixed(0)}%</span>
                            <span>Analyzed: {formatTime(item.analyzedAt || item.createdAt)}</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-emerald-400/60" />
            <span>ChainSight AI</span>
            <span className="text-border">|</span>
            <span>Mantle Network</span>
          </div>
          <div className="text-[10px] text-muted-foreground/60">
            Powered by Mantle Network
          </div>
        </div>
      </footer>

      {/* ─── ANALYSIS DIALOG ─────────────────────────────────────────── */}
      <Dialog open={analysisDialog.open} onOpenChange={(open) => setAnalysisDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="bg-[#111827] border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Brain className="w-4 h-4 text-purple-400" />
              {analysisDialog.anomaly?.isAnalyzed
                ? 'AI Analysis Results'
                : 'Running AI Analysis...'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {analysisDialog.anomaly
                ? `${TYPE_LABELS[analysisDialog.anomaly.type]} — ${SEVERITY_LABELS[analysisDialog.anomaly.severity]} severity`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {analysisDialog.loading ? (
            <div className="space-y-4 py-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Brain className="w-10 h-10 text-purple-400 animate-pulse" />
                  <div className="absolute inset-0 bg-purple-400/20 rounded-full animate-ping" />
                </div>
                <p className="text-xs text-muted-foreground">Analyzing anomaly with ChainSight AI...</p>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          ) : analysisDialog.analysis ? (
            <div className="space-y-4">
              {/* Risk Level */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Risk Level:</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    analysisDialog.analysis.riskLevel === 'low'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : analysisDialog.analysis.riskLevel === 'medium'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : analysisDialog.analysis.riskLevel === 'high'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-red-600/20 text-red-400 border-red-500/40'
                  }`}
                >
                  {(analysisDialog.analysis.riskLevel || 'medium').toUpperCase()}
                </Badge>
              </div>

              <Separator className="bg-border/30" />

              {/* Summary */}
              <div>
                <h4 className="text-[10px] uppercase text-muted-foreground mb-1.5">Summary</h4>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {analysisDialog.analysis.summary}
                </p>
              </div>

              {/* Recommendation */}
              <div className="bg-[#0d1117] rounded-lg p-3 border border-border/30">
                <h4 className="text-[10px] uppercase text-muted-foreground mb-1.5">Recommendation</h4>
                <p className="text-xs text-emerald-400/90 leading-relaxed">
                  {analysisDialog.analysis.recommendation}
                </p>
              </div>

              {/* Raw Response Toggle */}
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  View Raw Response
                </summary>
                <pre className="mt-2 p-3 bg-[#0a0e17] rounded-lg text-[10px] text-muted-foreground overflow-x-auto max-h-40 overflow-y-auto font-mono">
                  {analysisDialog.analysis.rawResponse}
                </pre>
              </details>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground">No analysis available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── ALERTS DIALOG ───────────────────────────────────────────── */}
      <Dialog open={alertDialog} onOpenChange={setAlertDialog}>
        <DialogContent className="bg-[#111827] border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Bell className="w-4 h-4 text-amber-400" />
              Notifications
            </DialogTitle>
            <DialogDescription className="text-xs">
              {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No alerts</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    alert.isRead
                      ? 'bg-[#0d1117] border-border/20 opacity-60'
                      : 'bg-[#1a1f2e] border-border/40 hover:border-amber-500/30'
                  }`}
                  onClick={() => !alert.isRead && markAlertRead(alert.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${severityDot(alert.severity)}`} />
                    <span className="text-xs font-medium">{alert.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {alert.message}
                  </p>
                  <span className="text-[9px] text-muted-foreground/60 mt-1 block">
                    {formatTime(alert.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Stat Card Component ─────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  trend,
  trendUp,
  iconBg,
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend: string
  trendUp: boolean
  iconBg: string
}) {
  return (
    <Card className="bg-[#111827] border-border/50 card-glow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
          <div
            className={`flex items-center gap-0.5 text-[10px] font-medium ${
              trendUp ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  )
}
