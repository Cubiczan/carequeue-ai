import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const business = await db.businessProfile.findUnique({
      where: { id },
      include: {
        _count: {
          select: { threads: true, scanRuns: true },
        },
      },
    });
    if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(business);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const business = await db.businessProfile.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(business);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.redditThread.deleteMany({ where: { businessId: id } });
    await db.scanRun.deleteMany({ where: { businessId: id } });
    await db.emailDigest.deleteMany({ where: { businessId: id } });
    await db.businessProfile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
