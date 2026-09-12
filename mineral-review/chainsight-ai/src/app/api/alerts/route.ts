import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const severity = searchParams.get('severity')
    const isRead = searchParams.get('isRead')

    const where: Record<string, unknown> = {}
    if (severity) where.severity = severity
    if (isRead === 'true') where.isRead = true
    if (isRead === 'false') where.isRead = false

    const [alerts, total] = await Promise.all([
      db.alert.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.alert.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ])

    return NextResponse.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Alerts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId } = body

    if (!alertId) {
      return NextResponse.json({ error: 'alertId is required' }, { status: 400 })
    }

    const alert = await db.alert.update({
      where: { id: alertId },
      data: { isRead: true },
    })

    return NextResponse.json({ alert })
  } catch (error) {
    console.error('Alerts POST error:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}
