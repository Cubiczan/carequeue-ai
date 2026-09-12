# Shop Floor UI Documentation

## Overview

The Shop Floor UI is a React-based tablet-optimized interface for battery recycling operations. It provides real-time access to production data, quality inspections, and traceability information.

## Features

### Pages

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/` | Overview of operations, quick actions, alerts |
| **Work Orders** | `/work-orders` | List and manage production work orders |
| **Work Order Detail** | `/work-orders/:id` | View and complete specific work orders |
| **Battery Receipt** | `/battery-receipt` | Record inbound battery shipments |
| **Quality Check** | `/quality-check` | Create and complete quality inspections |
| **Material Recovery** | `/material-recovery` | Track recovered materials from recycling |
| **Traceability** | `/traceability` | View batch genealogy and chain of custody |
| **Settings** | `/settings` | Configure shop floor preferences |

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3
- **State Management**: Zustand (for global state)
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Notifications**: React Hot Toast
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- Integration API running on port 3001

### Installation

```bash
cd /Users/cubiczan/battery-erp/shop-floor

# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3002
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Component Structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Root component with routing
├── index.css             # Global styles (Tailwind)
├── pages/
│   ├── Dashboard.tsx     # Operations dashboard
│   ├── WorkOrders.tsx    # Work order list
│   ├── WorkOrderDetail.tsx
│   ├── BatteryReceipt.tsx
│   ├── QualityCheck.tsx
│   ├── MaterialRecovery.tsx
│   ├── Traceability.tsx
│   └── Settings.tsx
└── components/           # (to be added)
    ├── Layout.tsx
    ├── Navigation.tsx
    └── ui/
```

## API Integration

The UI connects to the Integration API which proxies requests to backend systems:

```
Shop Floor UI (3002)
       ↓
Integration API (3001)
       ↓
┌──────┴──────┐
ERPNext   Carbon
(8080)    (3000)
```

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/carbon/work-orders` | List work orders |
| `GET /api/carbon/work-orders/:id` | Get work order details |
| `PATCH /api/carbon/work-orders/:id/status` | Update work order status |
| `POST /api/carbon/work-orders/:id/complete` | Complete work order |
| `GET /api/carbon/batches` | List batches |
| `POST /api/carbon/batches` | Create battery receipt |
| `GET /api/carbon/batches/:id/traceability` | Get traceability chain |
| `GET /api/carbon/quality-inspections` | List quality inspections |
| `POST /api/carbon/quality-inspections` | Create quality inspection |
| `POST /api/carbon/material-consumption` | Record material recovery |
| `GET /api/carbon/analytics/production` | Dashboard statistics |

## Key Features

### 1. Dashboard

Real-time overview of shop floor operations:
- Active work orders count
- Pending quality checks
- Batches in process
- System alerts
- Quick action buttons

### 2. Work Order Management

- Filter by status (pending, in progress, completed)
- Search by item, ID, or BOM
- Start/stop/complete work orders
- Record production data
- View material requirements

### 3. Battery Receipt

- Record inbound battery shipments
- Capture supplier information
- Specify battery type and chemistry
- Log quantity and weight
- Assign initial grade
- Print barcode labels (future)

### 4. Quality Inspections

- View pending inspections
- Create new inspection records
- Record measurement readings
- Pass/fail determinations
- Link to work orders or batches

### 5. Material Recovery

- Track recovered materials by process stage
- Record quantity and purity
- Assign to warehouses
- View recovery statistics

### 6. Traceability

- Search batches by ID
- View complete process history
- Visual timeline of operations
- Mass balance tracking
- Chain of custody display

## Styling

### Color Scheme

```css
--primary: #4CAF50;    /* Green - actions, success */
--secondary: #2196F3;  /* Blue - information */
--danger: #f44336;     /* Red - errors, stop */
--warning: #ff9800;    /* Orange - warnings, in-progress */
```

### Component Classes

```css
.btn-primary    /* Primary action button */
.btn-secondary  /* Secondary action button */
.btn-danger     /* Danger/destructive action */
.card           /* Content card container */
.input          /* Form input field */
.label          /* Form label */
.badge          /* Status badge */
.badge-success  /* Green success badge */
.badge-warning  /* Yellow warning badge */
.badge-danger   /* Red error badge */
.badge-info     /* Blue info badge */
```

## Tablet Deployment

### Recommended Hardware

- iPad (8th gen or later) or Android tablet
- 10" or larger display recommended
- WiFi or Ethernet connectivity
- Optional: Barcode scanner (USB or Bluetooth)
- Optional: Label printer for barcode labels

### Kiosk Mode Setup

For dedicated station tablets:

**iPad:**
1. Open Shop Floor UI in Safari
2. Add to Home Screen
3. Enable Guided Access (Settings → Accessibility)
4. Launch from Home Screen (full screen, no browser UI)

**Android:**
1. Open in Chrome
2. Add to Home Screen
3. Enable Screen Pinning (Settings → Security)
4. Launch from Home Screen

### Station Types

Configure different tablets for different stations:

| Station | Page | Accessories |
|---------|------|-------------|
| Receipt | `/battery-receipt` | Barcode scanner, Label printer |
| Disassembly | `/work-orders` | Barcode scanner |
| Quality | `/quality-check` | Testing equipment interface |
| Recovery | `/material-recovery` | Scale integration |

## Offline Support

The app is designed for online operation. For areas with unreliable connectivity:

1. Consider deploying a local server
2. Use WiFi repeaters for coverage
3. Implement store-and-forward for critical operations (future)

## Future Enhancements

- [ ] Barcode scanning integration
- [ ] Label printing
- [ ] Offline mode with sync
- [ ] Downtime tracking
- [ ] Production analytics charts
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Andon board display
- [ ] Machine integration (IoT)
- [ ] Digital work instructions

## Troubleshooting

### App not loading

```bash
# Check development server
npm run dev

# Verify Integration API is running
curl http://localhost:3001/health

# Check browser console for errors
```

### API calls failing

```bash
# Verify proxy configuration in vite.config.ts
# Ensure Integration API is accessible
# Check CORS settings in Integration API
```

### Build errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npx tsc --noEmit
```

## Support

- Documentation: `/Users/cubiczan/battery-erp/README.md`
- API Docs: `/Users/cubiczan/battery-erp/integrations/README.md`
- Issues: (add your issue tracker)
