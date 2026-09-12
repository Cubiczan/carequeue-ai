import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePatientAuth } from '@/lib/require-patient-auth';

// GET /api/patients — List all patients with latest vitals and alert count
export async function GET(request: Request) {
  const unauthorized = requirePatientAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const patients = await db.patient.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        alerts: {
          where: { acknowledged: false },
        },
        vitals: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    const formatted = patients.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      conditions: p.conditions,
      medications: p.medications,
      latestVitals: p.vitals[0] || null,
      activeAlertCount: p.alerts.length,
      hasCriticalAlert: p.alerts.some(a => a.type === 'critical'),
      createdAt: p.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch patients:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

// POST /api/patients — Create new patient
export async function POST(request: Request) {
  const unauthorized = requirePatientAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { name, age, gender, conditions, medications } = body;

    if (!name || !age || !gender) {
      return NextResponse.json({ error: 'Name, age, and gender are required' }, { status: 400 });
    }

    const patient = await db.patient.create({
      data: {
        name,
        age: parseInt(age, 10),
        gender,
        conditions: conditions || '',
        medications: medications || '',
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error('Failed to create patient:', error);
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}
