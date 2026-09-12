import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePatientAuth } from '@/lib/require-patient-auth';
import { scoreVitals } from '@/lib/vitals-scoring';

// GET /api/patients/[id]/vitals — Get vitals history for a patient
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requirePatientAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { patientId: id };

    if (startDate || endDate) {
      where.recordedAt = {} as Record<string, Date>;
      if (startDate) (where.recordedAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.recordedAt as Record<string, Date>).lte = new Date(endDate);
    }

    const vitals = await db.vitalsReading.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
    });

    return NextResponse.json(vitals);
  } catch (error) {
    console.error('Failed to fetch vitals:', error);
    return NextResponse.json({ error: 'Failed to fetch vitals' }, { status: 500 });
  }
}

// POST /api/patients/[id]/vitals — Add new vitals reading
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requirePatientAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await request.json();
    const { heartRate, systolic, diastolic, temperature, spo2, notes } = body;

    const reading = await db.vitalsReading.create({
      data: {
        patientId: id,
        heartRate: heartRate ?? 72,
        systolic: systolic ?? 120,
        diastolic: diastolic ?? 80,
        temperature: temperature ?? 98.6,
        spo2: spo2 ?? 98,
        notes: notes || '',
      },
    });

    // Auto-generate alerts for abnormal vitals. Scoring is delegated to the
    // pure, unit-tested helper in '@/lib/vitals-scoring'.
    const newAlerts = scoreVitals({ heartRate, systolic, diastolic, temperature, spo2 });

    for (const alert of newAlerts) {
      await db.alert.create({
        data: { patientId: id, ...alert },
      });
    }

    return NextResponse.json({
      reading,
      alertsGenerated: newAlerts.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create vitals reading:', error);
    return NextResponse.json({ error: 'Failed to create vitals reading' }, { status: 500 });
  }
}
