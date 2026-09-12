import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const minScore = searchParams.get('minScore');

    const where: Record<string, unknown> = {};
    if (businessId) where.businessId = businessId;
    if (status) where.replyStatus = status;
    if (minScore) where.totalScore = { gte: parseInt(minScore) };

    const threads = await db.redditThread.findMany({
      where,
      orderBy: { totalScore: 'desc' },
      take: 100,
    });
    return NextResponse.json(threads);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
