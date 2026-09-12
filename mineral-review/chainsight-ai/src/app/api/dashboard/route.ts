import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [
      totalTransactions,
      totalAnomalies,
      criticalAlerts,
      unreadAlerts,
      monitoredAddresses,
    ] = await Promise.all([
      db.onchainTransaction.count(),
      db.anomaly.count(),
      db.alert.count({ where: { severity: 'critical' } }),
      db.alert.count({ where: { isRead: false } }),
      db.monitoredAddress.count(),
    ])

    const anomalyByType = await db.anomaly.groupBy({
      by: ['type'],
      _count: { id: true },
    })

    const anomalyBySeverity = await db.anomaly.groupBy({
      by: ['severity'],
      _count: { id: true },
    })

    const anomalyByDex = await db.onchainTransaction.findMany({
      take: 200,
      select: { dex: true, usdValue: true },
    })

    const dexVolume: Record<string, number> = {}
    for (const tx of anomalyByDex) {
      dexVolume[tx.dex] = (dexVolume[tx.dex] || 0) + tx.usdValue
    }

    const recentAnomalies = await db.anomaly.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    // Fetch AI analyses for these anomalies separately
    const recentAnomalyIds = recentAnomalies.map((a) => a.id)
    const analyses = await db.aIAnalysis.findMany({
      where: { anomalyId: { in: recentAnomalyIds } },
    })
    const analysisMap = new Map(analyses.map((a) => [a.anomalyId, a]))

    const recentAnomaliesWithAnalysis = recentAnomalies.map((a) => ({
      ...a,
      analysis: analysisMap.get(a.id) || null,
    }))

    const recentTransactions = await db.onchainTransaction.findMany({
      take: 15,
      orderBy: { timestamp: 'desc' },
    })

    const hourlyVolume = await db.onchainTransaction.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200,
      select: { timestamp: true, usdValue: true, dex: true },
    })

    const hourlyBuckets: Record<string, Record<string, number>> = {}
    for (const tx of hourlyVolume) {
      const hour = new Date(tx.timestamp)
      hour.setMinutes(0, 0, 0)
      const key = hour.toISOString()
      if (!hourlyBuckets[key]) hourlyBuckets[key] = {}
      hourlyBuckets[key][tx.dex] = (hourlyBuckets[key][tx.dex] || 0) + tx.usdValue
    }

    return NextResponse.json({
      stats: {
        totalTransactions,
        totalAnomalies,
        criticalAlerts,
        unreadAlerts,
        monitoredAddresses,
      },
      anomalyByType: anomalyByType.map((a) => ({ type: a.type, count: a._count.id })),
      anomalyBySeverity: anomalyBySeverity.map((a) => ({ severity: a.severity, count: a._count.id })),
      dexVolume,
      recentAnomalies: recentAnomaliesWithAnalysis,
      recentTransactions,
      hourlyVolume: Object.entries(hourlyBuckets)
        .slice(-24)
        .map(([time, dexes]) => ({ time, ...dexes })),
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
