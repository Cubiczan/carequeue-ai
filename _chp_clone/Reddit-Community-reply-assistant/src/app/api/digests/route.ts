import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    const where: Record<string, unknown> = {};
    if (businessId) where.businessId = businessId;

    const digests = await db.emailDigest.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(digests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
