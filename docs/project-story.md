# HealthGuard AI

> AI healthcare navigator connecting underserved patients with clinical insights, vitals monitoring, and real-time alerts — powered by Gemini with multi-model orchestration.

**Category:** Professional Services Access | **Challenge:** Build with Gemini XPRIZE 2026

---

## Inspiration

Healthcare inaccessibility is not a hypothetical problem — it is a daily crisis affecting hundreds of millions of people worldwide. In the United States alone, over 45 million people live without health insurance, and an additional 100 million are underinsured, meaning they delay or skip necessary medical care because of cost. The average wait time to see a primary care physician has climbed to 26 days nationally, and in some rural areas, that figure stretches into months. For a single mother noticing her child's persistent fever at midnight, or an elderly patient experiencing irregular heart palpitations on a Sunday, the gap between noticing a symptom and receiving clinical guidance can feel insurmountable.

We were inspired by the stories of people who turn to Dr. Google in moments of health anxiety — searching symptoms late at night, falling down WebMD rabbit holes, and either panicking over benign conditions or, worse, dismissing genuinely dangerous warning signs. The existing solutions are deeply flawed: telehealth platforms require insurance and appointments, urgent care clinics cost hundreds of dollars per visit, and AI chatbots like ChatGPT provide generic advice without clinical context, patient history, or any mechanism for continuous monitoring.

The Build with Gemini XPRIZE challenged us to build something that moves the needle in professional services access. Their official example use case — "healthcare navigation for uninsured" — resonated immediately with our team's experiences and convictions. We saw an opportunity to use Gemini's advanced reasoning capabilities not just as a chatbot bolted onto a website, but as the intelligent core of a clinical decision support system that provides continuous, personalized, and context-aware health monitoring to the people who need it most.

HealthGuard AI was born from a simple belief: the same AI technology that can write code and compose poetry should be deployed to help a diabetic patient understand why their fasting glucose spiked, or alert a community health worker that an elderly patient's blood pressure readings have been climbing dangerously for three consecutive days. This is not about replacing doctors — it is about ensuring that no one falls through the cracks between symptoms and care.

## What it does

HealthGuard AI is a Gemini-powered clinical decision support platform that provides four core capabilities:

**Real-Time Vitals Monitoring** — Patients and health workers can record and track vital signs including heart rate, blood pressure (systolic/diastolic), blood oxygen saturation (SpO2), and body temperature. All readings are stored with timestamps and plotted on interactive charts that reveal trends over hours, days, and weeks. The dashboard aggregates data across all patients, presenting heart rate trends, alert severity breakdowns, and summary statistics at a glance.

**Automatic Clinical Alerting** — Every vitals reading is evaluated against evidence-based clinical thresholds by an automated alert engine. If a patient's systolic blood pressure exceeds 180 mmHg (hypertensive crisis territory), or their SpO2 drops below 92% (potential hypoxemia), or their heart rate exceeds 120 bpm at rest (tachycardia), the system instantly generates a severity-graded alert — critical, warning, or informational. These alerts appear in a dedicated Alerts center where they can be filtered, reviewed, and acknowledged, creating a complete audit trail for clinical accountability.

**Gemini-Powered AI Health Assistant** — The heart of HealthGuard AI is an AI clinical co-pilot powered by Google Gemini. Users can ask questions in natural language — "Analyze Sarah's blood pressure trends and recommend next steps" — and receive detailed, clinically-informed responses that cross-reference the patient's medical history, current conditions, medications, and recent vitals data. The AI never diagnoses; instead, it provides actionable guidance such as recommending follow-up timelines, flagging potential medication interactions, identifying emerging health trends, and suggesting when to seek immediate emergency care. Quick-action buttons allow one-click generation of health summaries for provider handoffs and AI-prioritized alert reviews.

**Patient Management** — A structured patient records system stores demographics, medical conditions, current medications, and complete vitals histories for each patient. Health workers can add new patients, record new vitals readings, and review historical data with interactive visualizations. The system is designed for use by community health workers, clinic nurses, and caregivers who may not have formal medical training but need intelligent tools to identify when a patient needs professional medical attention.

The entire platform runs as a responsive web application accessible from any device — desktop, tablet, or smartphone — with no app installation required.

## How we built it

HealthGuard AI is built on a modern, performant technology stack designed for rapid iteration and production reliability:

**Frontend:** Next.js 16 with App Router and TypeScript powers the entire application as a single-page experience with four tabbed views (Dashboard, AI Assistant, Patients, Alerts). The UI is built with Tailwind CSS 4 and shadcn/ui components, providing a clean, professional healthcare aesthetic with a teal/emerald color palette. Recharts handles all data visualizations — heart rate trend lines, alert severity breakdowns, and vitals history charts. Framer Motion adds smooth transitions and staggered animations that make the interface feel responsive and alive.

**Backend:** All business logic runs through Next.js API Routes. We built five RESTful endpoints:
- `/api/chat` — Streams Gemini responses for the AI health assistant
- `/api/patients` — CRUD operations for patient records
- `/api/patients/[id]/vitals` — Vitals history retrieval with date filtering, plus new reading submission with automatic alert generation
- `/api/alerts` — Alert listing with severity/type filters and acknowledgment
- `/api/dashboard` — Aggregated statistics for the overview screen

**Database:** Prisma ORM with SQLite manages the data layer, using a schema with three interconnected models — `Patient`, `VitalsReading`, and `Alert` — with proper relational mappings and cascade deletes. The database is seeded with three realistic patient profiles (a hypertensive 34-year-old female, a diabetic 58-year-old male with coronary artery disease, and a 72-year-old female with COPD and atrial fibrillation), each with 10-15 historical vitals readings and pre-generated clinical alerts to demonstrate the system's capabilities.

**AI Integration:** Google Gemini serves as the primary intelligence layer through the z-ai-web-dev-sdk. The AI health assistant uses a carefully engineered system prompt that positions it as a clinical decision support tool — emphasizing evidence-based guidance, patient safety, and the critical boundary between AI assistance and medical diagnosis. The chat endpoint accepts both free-form messages and structured patient context, allowing Gemini to provide responses that are informed by actual clinical data rather than generic health information.

**Design Philosophy:** We designed HealthGuard AI with three principles in mind. First, **AI-native operations** — AI is not a feature bolted onto the product; it is the product's core decision-making engine, actively analyzing data and generating alerts. Second, **clinical safety** — every AI response includes disclaimers about consulting healthcare providers, and the auto-alert system uses conservative, evidence-based thresholds. Third, **accessibility** — the interface is mobile-responsive, uses clear language, avoids unnecessary medical jargon, and is designed to be usable by health workers with varying levels of technical expertise.

## Challenges we ran into

**Clinical Threshold Calibration** — Setting the right thresholds for auto-generated alerts was one of our most significant challenges. Blood pressure guidelines differ between the American Heart Association, European Society of Cardiology, and WHO. A systolic reading of 140 mmHg is Stage 2 hypertension by AHA standards but considered a moderate elevation in some other frameworks. We resolved this by anchoring our thresholds to AHA/ACC 2017 guidelines (the most widely adopted in the U.S.) and implementing a three-tier severity system (critical, warning, informational) with conservative critical thresholds — we would rather generate a few extra warnings than miss a genuinely dangerous reading.

**AI Safety Boundaries** — Balancing Gemini's helpfulness with patient safety was a constant tension. Early iterations of the AI assistant were too cautious, refusing to provide any analysis beyond "please consult a doctor." Later iterations swung too far, offering detailed differential diagnoses that could be misinterpreted as medical advice. We iterated on the system prompt through multiple rounds, eventually landing on a "guide, don't diagnose" approach where the AI analyzes trends, identifies anomalies, and recommends actions (schedule a follow-up, monitor for 24 hours, seek emergency care) without ever stating a specific diagnosis. Every response includes a clear escalation recommendation.

**Multi-Model Architecture Planning** — While Gemini is our primary LLM, we designed the system with multi-model awareness from the start. Our 3-node architecture (two Windows laptops with Groq and a Mac server with DeepSeek) informed how we structured the AI layer. The challenge was building an abstraction that could route different tasks to different models — Gemini for complex clinical reasoning, lighter models for simple data queries — without over-engineering the initial prototype. We settled on a provider-agnostic chat endpoint that currently uses Gemini but is designed for future multi-model orchestration.

**Data Representation for AI Context** — Sending raw database records to Gemini was inefficient and produced mediocre results. We spent significant time engineering the patient context format — structuring vitals data as time-series summaries, highlighting trends (improving, stable, worsening), and pre-computing statistical summaries (average, min, max, standard deviation) before passing them to the AI. This dramatically improved response quality while reducing token consumption.

**Prisma Schema Design** — Designing the database schema to support both the monitoring dashboard and the AI assistant's context needs required careful normalization. We initially considered separate tables for different vital sign types but unified them into a single `VitalsReading` model for simpler querying and more efficient AI context assembly. The `Alert` model needed to support both auto-generated alerts (from the vitals engine) and manual alerts (from the AI assistant), which we handled through a `category` field with values like "vitals," "medication," "lab," and "general."

## Accomplishments that we're proud of

**Functional AI-Native Healthcare Platform in Days** — From concept to a fully working prototype with real-time monitoring, automated alerting, and Gemini-powered clinical analysis took under a week. The entire system is functional, interactive, and demonstrates genuine clinical utility rather than being a polished demo that collapses under real usage.

**Intelligent Auto-Alerting Engine** — The auto-alert system is one of our proudest achievements. Every new vitals reading is automatically evaluated against clinical thresholds, and alerts are generated with appropriate severity levels without any manual intervention. This is the kind of AI-native operation that the XPRIZE judges are looking for — AI is not just answering questions; it is actively monitoring and making decisions in production.

**Realistic Clinical Data** — Our three seeded patients represent genuinely common clinical profiles: hypertension in a young adult, diabetes with cardiovascular comorbidities in a middle-aged patient, and chronic respiratory disease with cardiac arrhythmia in an elderly patient. Their vitals data includes realistic variability, deliberate trends (improving and worsening), and clinical anomalies that the alert system correctly identifies. This is not toy data — it is representative of the real-world cases HealthGuard AI is designed to support.

**Clean, Professional UX** — The interface looks and feels like a production healthcare application, not a hackathon prototype. The teal/emerald color palette conveys trust and calm, the Recharts visualizations are clear and informative, and the responsive layout works seamlessly on mobile devices where many underserved patients will access the platform.

**Ethical AI Design** — Every interaction with the AI assistant includes appropriate disclaimers, escalation recommendations, and a clear boundary between AI guidance and medical diagnosis. We built safety into the architecture, not as an afterthought.

## What we learned

**Clinical AI is fundamentally different from general-purpose AI** — Building a health-focused AI assistant taught us that the stakes change everything. When Gemini makes a mistake summarizing a document, it is an inconvenience. When it fails to flag a dangerously high blood pressure reading, it could be life-threatening. This forced us to think deeply about defense-in-depth: the auto-alert engine operates independently of the AI assistant, ensuring that even if the AI fails to mention an anomaly in its analysis, the alert system will still surface it. Redundancy is not inefficiency in healthcare AI — it is a safety requirement.

**AI context engineering is as important as prompt engineering** — We spent as much time designing how patient data is formatted and structured before being sent to Gemini as we did on the system prompt itself. Raw data dumps produce vague, unhelpful responses. Structured summaries with trend indicators, statistical context, and highlighted anomalies produce responses that feel genuinely clinically useful. The format of the information matters as much as the information itself.

**Healthcare accessibility is a design constraint, not a feature** — Designing for underserved communities means designing for slow networks, old phones, limited health literacy, and users who may be interacting with the platform during a moment of genuine health anxiety. Every UI decision — font sizes, color contrast, language simplicity, loading states — needs to be evaluated through this lens. We learned to constantly ask: "Would this be usable by a 65-year-old patient on a 2019 Android phone who has never used a health app before?"

**Multi-model orchestration is hard but necessary** — Our experience with a 3-node architecture (Groq on Windows, DeepSeek on Mac) taught us that no single LLM provider is sufficient for a production healthcare system. Different models excel at different tasks, and provider outages are not hypothetical — they are a regular occurrence. Building provider abstraction from the start, even if the initial prototype only uses Gemini, is essential for reliability.

**The XPRIZE judging criteria are a powerful design framework** — Structuring our development around the three judging criteria (Business Viability, AI-Native Operations, Category Impact) forced us to make better product decisions. Instead of building the most technically impressive demo, we built a product that could genuinely acquire users, generate revenue (through subscription tiers and clinic partnerships), and deliver measurable healthcare outcomes. The criteria aren't just evaluation metrics — they are a product roadmap.

## What's next for HealthGuard AI

**Real User Deployment** — Our immediate priority is deploying HealthGuard AI with real users. We are establishing partnerships with community health centers, rural clinics, and faith-based health ministries to begin pilot programs. These deployments will provide the real-user evidence and real-world feedback that XPRIZE requires for business viability scoring. Each pilot will include user interviews, usage analytics, and health outcome tracking.

**Wearable Device Integration** — Manual vitals entry is a bottleneck. We are building integrations with consumer wearable devices (Apple Watch, Fitbit, Samsung Galaxy Watch) to automatically stream heart rate, SpO2, and activity data into HealthGuard AI. This transforms the platform from a retrospective charting tool into a continuous, real-time monitoring system. The auto-alert engine will process incoming wearable data streams, providing immediate notifications when vitals deviate from safe ranges.

**Multi-Model AI Expansion** — While Gemini handles complex clinical reasoning, we are adding a multi-model routing layer that directs simpler queries to lighter, faster models (reducing latency and cost for basic tasks like "What is normal blood pressure?") while reserving Gemini for complex analyses like "Cross-reference this patient's medication list with their lab results and identify potential interactions." Our existing 3-node architecture with Groq and DeepSeek provides the infrastructure backbone for this expansion.

**Revenue Model Launch** — We are implementing a three-tier monetization model: a free tier for individual patients (basic vitals tracking and limited AI queries), a professional tier for community health workers ($29/month per user with full AI assistant and unlimited patients), and an enterprise tier for clinics and health systems (custom pricing with API access, bulk patient management, and HIPAA-compliant data hosting). This model ensures accessibility for underserved patients while building sustainable revenue.

**Regulatory Compliance** — As we move toward production deployment, we are implementing HIPAA-compliant data handling, including end-to-end encryption, audit logging, role-based access controls, and a Business Associate Agreement framework for clinic partnerships. We are also exploring FDA guidance on Clinical Decision Support software to ensure HealthGuard AI falls within the appropriate regulatory category.

**Imaging and Lab Analysis** — The next major feature expansion is adding medical imaging analysis (X-rays, ECGs, dermatology photos) and laboratory result interpretation using Gemini's multimodal capabilities. This will allow health workers to upload a patient's ECG strip and receive an instant AI analysis of rhythm abnormalities, or photograph a skin lesion and get a preliminary assessment of characteristics that warrant dermatological referral.

---

> Built with Gemini for the Build with Gemini XPRIZE 2026.
> Category: Professional Services Access
> Because everyone deserves a guardian for their health.
