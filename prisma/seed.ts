import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 12) + 7, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function hoursAgo(n: number) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

async function main() {
  // Clean existing data
  await db.vitalsReading.deleteMany();
  await db.alert.deleteMany();
  await db.patient.deleteMany();

  // === Patient 1: Sarah Johnson ===
  const sarah = await db.patient.create({
    data: {
      name: "Sarah Johnson",
      age: 34,
      gender: "Female",
      conditions: "Hypertension, Anxiety",
      medications: "Lisinopril 10mg daily, Escitalopram 10mg daily",
    },
  });

  const sarahVitals = [
    { days: 14, hr: 78, sys: 142, dia: 92, temp: 98.4, spo2: 99 },
    { days: 13, hr: 82, sys: 148, dia: 96, temp: 98.6, spo2: 98 },
    { days: 12, hr: 76, sys: 138, dia: 88, temp: 98.2, spo2: 99 },
    { days: 10, hr: 80, sys: 145, dia: 94, temp: 98.8, spo2: 98 },
    { days: 9, hr: 74, sys: 132, dia: 84, temp: 98.4, spo2: 99 },
    { days: 7, hr: 85, sys: 152, dia: 98, temp: 99.0, spo2: 97 },
    { days: 6, hr: 79, sys: 140, dia: 90, temp: 98.6, spo2: 98 },
    { days: 5, hr: 77, sys: 136, dia: 86, temp: 98.3, spo2: 99 },
    { days: 3, hr: 81, sys: 144, dia: 92, temp: 98.5, spo2: 98 },
    { days: 2, hr: 75, sys: 130, dia: 82, temp: 98.4, spo2: 99 },
    { days: 1, hr: 78, sys: 135, dia: 87, temp: 98.6, spo2: 99 },
    { hours: 8, hr: 76, sys: 128, dia: 80, temp: 98.5, spo2: 99 },
  ];

  for (const v of sarahVitals) {
    await db.vitalsReading.create({
      data: {
        patientId: sarah.id,
        heartRate: v.hr,
        systolic: v.sys,
        diastolic: v.dia,
        temperature: v.temp,
        spo2: v.spo2,
        notes: v.sys > 140 ? "Elevated BP noted" : "Within normal range",
        recordedAt: v.hours !== undefined ? hoursAgo(v.hours) : daysAgo(v.days),
      },
    });
  }

  await db.alert.create({
    data: {
      patientId: sarah.id,
      type: "warning",
      category: "vitals",
      message: "Systolic BP consistently above 140 mmHg over the past week. Consider medication adjustment.",
      severity: 3,
      acknowledged: false,
      createdAt: daysAgo(7),
    },
  });

  await db.alert.create({
    data: {
      patientId: sarah.id,
      type: "info",
      category: "medication",
      message: "Lisinopril refill due in 5 days.",
      severity: 1,
      acknowledged: true,
      createdAt: daysAgo(2),
    },
  });

  // === Patient 2: Marcus Chen ===
  const marcus = await db.patient.create({
    data: {
      name: "Marcus Chen",
      age: 58,
      gender: "Male",
      conditions: "Type 2 Diabetes, Mild Coronary Artery Disease",
      medications: "Metformin 1000mg BID, Atorvastatin 40mg daily, Aspirin 81mg daily",
    },
  });

  const marcusVitals = [
    { days: 14, hr: 72, sys: 135, dia: 85, temp: 98.2, spo2: 97 },
    { days: 13, hr: 75, sys: 140, dia: 88, temp: 98.4, spo2: 96 },
    { days: 12, hr: 88, sys: 158, dia: 100, temp: 98.8, spo2: 96 },
    { days: 11, hr: 70, sys: 132, dia: 82, temp: 98.2, spo2: 97 },
    { days: 10, hr: 78, sys: 142, dia: 90, temp: 98.6, spo2: 97 },
    { days: 8, hr: 82, sys: 150, dia: 95, temp: 98.5, spo2: 96 },
    { days: 7, hr: 74, sys: 138, dia: 86, temp: 98.3, spo2: 97 },
    { days: 6, hr: 90, sys: 165, dia: 105, temp: 99.2, spo2: 95 },
    { days: 5, hr: 80, sys: 145, dia: 92, temp: 98.7, spo2: 96 },
    { days: 3, hr: 76, sys: 136, dia: 84, temp: 98.4, spo2: 97 },
    { days: 2, hr: 78, sys: 140, dia: 88, temp: 98.5, spo2: 97 },
    { days: 1, hr: 85, sys: 155, dia: 98, temp: 98.9, spo2: 96 },
    { hours: 4, hr: 82, sys: 148, dia: 94, temp: 98.6, spo2: 96 },
  ];

  for (const v of marcusVitals) {
    await db.vitalsReading.create({
      data: {
        patientId: marcus.id,
        heartRate: v.hr,
        systolic: v.sys,
        diastolic: v.dia,
        temperature: v.temp,
        spo2: v.spo2,
        notes: v.sys > 155 ? "Significantly elevated BP - urgent review" : v.hr > 85 ? "Slightly elevated heart rate" : "Stable",
        recordedAt: v.hours !== undefined ? hoursAgo(v.hours) : daysAgo(v.days),
      },
    });
  }

  await db.alert.create({
    data: {
      patientId: marcus.id,
      type: "critical",
      category: "vitals",
      message: "BP reading 165/105 mmHg with temperature 99.2°F detected. Possible hypertensive crisis. Immediate physician review recommended.",
      severity: 5,
      acknowledged: false,
      createdAt: daysAgo(6),
    },
  });

  await db.alert.create({
    data: {
      patientId: marcus.id,
      type: "warning",
      category: "lab",
      message: "HbA1c trending above 7.5%. Current diabetes management may need adjustment.",
      severity: 3,
      acknowledged: false,
      createdAt: daysAgo(3),
    },
  });

  await db.alert.create({
    data: {
      patientId: marcus.id,
      type: "info",
      category: "medication",
      message: "Annual eye exam overdue by 2 months for diabetic retinopathy screening.",
      severity: 2,
      acknowledged: false,
      createdAt: daysAgo(1),
    },
  });

  // === Patient 3: Elena Rodriguez ===
  const elena = await db.patient.create({
    data: {
      name: "Elena Rodriguez",
      age: 72,
      gender: "Female",
      conditions: "COPD, Atrial Fibrillation, Osteoarthritis",
      medications: "Tiotropium 18mcg daily, Warfarin 5mg daily, Acetaminophen 500mg PRN",
    },
  });

  const elenaVitals = [
    { days: 14, hr: 88, sys: 128, dia: 78, temp: 98.2, spo2: 95 },
    { days: 13, hr: 92, sys: 125, dia: 76, temp: 98.4, spo2: 94 },
    { days: 12, hr: 85, sys: 130, dia: 80, temp: 98.0, spo2: 95 },
    { days: 11, hr: 78, sys: 135, dia: 82, temp: 98.3, spo2: 93 },
    { days: 10, hr: 95, sys: 120, dia: 74, temp: 98.6, spo2: 92 },
    { days: 9, hr: 82, sys: 132, dia: 80, temp: 98.2, spo2: 94 },
    { days: 7, hr: 88, sys: 126, dia: 78, temp: 98.4, spo2: 95 },
    { days: 6, hr: 90, sys: 122, dia: 76, temp: 98.0, spo2: 93 },
    { days: 5, hr: 76, sys: 138, dia: 84, temp: 98.5, spo2: 95 },
    { days: 3, hr: 84, sys: 128, dia: 78, temp: 98.2, spo2: 94 },
    { days: 2, hr: 92, sys: 124, dia: 76, temp: 98.3, spo2: 93 },
    { days: 1, hr: 86, sys: 130, dia: 80, temp: 98.4, spo2: 94 },
    { hours: 6, hr: 80, sys: 126, dia: 78, temp: 98.1, spo2: 95 },
    { hours: 2, hr: 88, sys: 122, dia: 75, temp: 98.3, spo2: 94 },
  ];

  for (const v of elenaVitals) {
    await db.vitalsReading.create({
      data: {
        patientId: elena.id,
        heartRate: v.hr,
        systolic: v.sys,
        diastolic: v.dia,
        temperature: v.temp,
        spo2: v.spo2,
        notes: v.spo2 < 93 ? "SpO2 below 93% - monitor closely" : v.hr > 90 ? "Elevated heart rate - possible AFib episode" : "Stable",
        recordedAt: v.hours !== undefined ? hoursAgo(v.hours) : daysAgo(v.days),
      },
    });
  }

  await db.alert.create({
    data: {
      patientId: elena.id,
      type: "info",
      category: "vitals",
      message: "SpO2 readings trending between 92-95%. Continue current oxygen therapy protocol.",
      severity: 2,
      acknowledged: true,
      createdAt: daysAgo(5),
    },
  });

  await db.alert.create({
    data: {
      patientId: elena.id,
      type: "warning",
      category: "medication",
      message: "INR result of 3.2 slightly above target range (2.0-3.0) for Warfarin. Monitor for signs of bleeding.",
      severity: 3,
      acknowledged: false,
      createdAt: daysAgo(2),
    },
  });

  console.log("✅ Database seeded with 3 patients, vitals history, and alerts");
  console.log(`   - Sarah Johnson: ${sarahVitals.length} vitals readings, 2 alerts`);
  console.log(`   - Marcus Chen: ${marcusVitals.length} vitals readings, 3 alerts`);
  console.log(`   - Elena Rodriguez: ${elenaVitals.length} vitals readings, 2 alerts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
