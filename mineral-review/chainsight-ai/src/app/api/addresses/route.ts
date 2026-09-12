import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const addresses = await db.monitoredAddress.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error('Addresses API error:', error)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}
