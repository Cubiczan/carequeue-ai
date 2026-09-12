import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15')))
    const dex = searchParams.get('dex')
    const token = searchParams.get('token')
    const txType = searchParams.get('txType')

    const where: Record<string, unknown> = {}
    if (dex) where.dex = dex
    if (token) where.token = token
    if (txType) where.txType = txType

    const [transactions, total] = await Promise.all([
      db.onchainTransaction.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      db.onchainTransaction.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ])

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Transactions API error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
