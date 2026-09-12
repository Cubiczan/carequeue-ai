import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')
    const analyzed = searchParams.get('analyzed')

    const where: Record<string, unknown> = {}
    if (severity) where.severity = severity
    if (type) where.type = type
    if (analyzed === 'true') where.isAnalyzed = true
    if (analyzed === 'false') where.isAnalyzed = false

    const [anomalies, total] = await Promise.all([
      db.anomaly.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.anomaly.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ])

    // Fetch analyses for these anomalies
    const anomalyIds = anomalies.map((a) => a.id)
    const analyses = await db.aIAnalysis.findMany({
      where: { anomalyId: { in: anomalyIds } },
    })
    const analysisMap = new Map(analyses.map((a) => [a.anomalyId, a]))

    const anomaliesWithAnalysis = anomalies.map((a) => ({
      ...a,
      analysis: analysisMap.get(a.id) || null,
    }))

    return NextResponse.json({
      anomalies: anomaliesWithAnalysis,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Anomalies API error:', error)
    return NextResponse.json({ error: 'Failed to fetch anomalies' }, { status: 500 })
  }
}
