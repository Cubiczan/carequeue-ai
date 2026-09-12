import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const businesses = await db.businessProfile.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { threads: true, scanRuns: true },
        },
      },
    });
    return NextResponse.json(businesses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const business = await db.businessProfile.create({
      data: body,
    });
    return NextResponse.json(business, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
