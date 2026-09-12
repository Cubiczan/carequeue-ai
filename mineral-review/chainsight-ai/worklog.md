# ChainSight AI — Worklog

## Build Date: 2025-05-03

## Project Overview
ChainSight AI is an on-chain anomaly detection platform for the Mantle Network.

---

## Files Built / Modified

### 1. API Routes

| File | Method | Description |
|------|--------|-------------|
| `src/app/api/dashboard/route.ts` | GET | Dashboard overview stats, charts data, recent anomalies & transactions |
| `src/app/api/anomalies/route.ts` | GET | Paginated anomalies with severity/type/analyzed filters, includes AI analysis |
| `src/app/api/transactions/route.ts` | GET | Paginated transactions with DEX/token/txType filters |
| `src/app/api/analyze/route.ts` | POST | AI analysis via z-ai-web-dev-sdk, creates AIAnalysis record, marks anomaly analyzed |
| `src/app/api/alerts/route.ts` | GET/POST | Paginated alerts with filters; POST marks alert as read |
| `src/app/api/addresses/route.ts` | GET | Returns all monitored whale/contract addresses |

### 2. Frontend

| File | Description |
|------|-------------|
| `src/app/page.tsx` | Main dashboard — full single-page application with 4 tabs |
| `src/app/layout.tsx` | Root layout with ThemeProvider (dark mode default), updated metadata |
| `src/app/globals.css` | Dark cybersecurity theme with custom CSS variables, glow effects, animations |
| `public/logo.png` | AI-generated ChainSight AI logo |

### 3. Key Features Implemented

#### Dashboard Overview Tab
- 4 stat cards (Total Transactions, Active Anomalies, Critical Alerts, Monitored Addresses) with trend indicators
- Volume by DEX bar chart (recharts) — merchant_moe, agni_finance, fluxion
- Anomaly Distribution pie chart by severity (low/medium/high/critical)
- Anomaly Types horizontal bar chart
- Recent Anomalies table (last 10) with severity badges, confidence bars, analyze buttons
- Recent Transactions table (last 15) with address truncation, token badges, USD values

#### Anomaly Feed Tab
- Filter bar: severity dropdown, type dropdown, analyzed toggle
- Paginated grid of anomaly cards (3 columns on desktop, responsive)
- Each card: severity badge, type, description (truncated), confidence bar, timestamp
- "View Analysis" / "Run AI Analysis" buttons per anomaly
- Analysis dialog with animated loading state, risk level, summary, recommendation

#### Transactions Tab
- Filter bar: DEX, token, txType dropdowns
- Paginated table with full transaction fields
- Expandable rows showing detailed info (full hash, addresses, gas, block number)
- Monospace fonts for hashes and addresses

#### AI Analysis Tab
- Displays all analyzed anomalies with AI-generated insights
- Risk level badges (color-coded: green/amber/red)
- Summary text and actionable recommendations
- "Generate New Analysis" button triggers AI analysis for unanalyzed anomalies
- Card layout with severity indicators and timestamps

#### Header & Footer
- ChainSight AI logo with gradient shield icon
- Mantle Network badge
- Live status indicator with pulse animation
- Notification bell with unread count
- Alerts dialog with mark-as-read functionality
- Footer with project attribution

### 4. Design System
- Dark cybersecurity theme (background: #0a0e17, cards: #111827)
- Green accent (#00ff88 / #10b981) for primary actions
- Color-coded severity: green=low, amber=medium, red=high/critical
- Glow effects on cards (subtle green glow on hover)
- Custom scrollbar styling
- Live pulse animation for status indicator
- Responsive design (mobile-first, sm/md/lg/xl breakpoints)
- All shadcn/ui components used throughout
- Lucide-react icons for all UI elements
- Loading skeletons for async data states

### 5. Technical Details
- All API routes use relative paths (no localhost)
- z-ai-web-dev-sdk used server-side only for AI analysis
- Prisma queries optimized (separate AIAnalysis fetch, no undefined relations)
- Dark mode set as default via ThemeProvider
- ESLint passes with zero errors
- All dev server routes return 200 status

---

## Tech Stack
- Next.js 16 (App Router, Turbopack)
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui (New York style)
- Recharts for data visualization
- Prisma ORM (SQLite)
- z-ai-web-dev-sdk for AI analysis
- next-themes for dark mode
- Lucide React for icons
- Framer Motion (available)
