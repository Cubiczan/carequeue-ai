import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const totalThreads = await db.redditThread.count();
    const highIntent = await db.redditThread.count({
      where: { buyingIntentScore: { gte: 60 } },
    });
    const pendingReplies = await db.redditThread.count({
      where: { replyStatus: 'pending' },
    });
    const totalScans = await db.scanRun.count();
    const completedScans = await db.scanRun.count({
      where: { status: 'completed' },
    });

    const recentThreads = await db.redditThread.findMany({
      orderBy: { totalScore: 'desc' },
      take: 20,
      where: { isRelevant: true },
    });

    return NextResponse.json({
      totalThreads,
      highIntent,
      pendingReplies,
      totalScans,
      completedScans,
      recentThreads,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
