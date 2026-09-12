# Battery ERP Implementation Guide

Complete implementation guide for the ERPNext + Carbon Hybrid stack for battery recycling operations.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Battery Recycling Workflows](#battery-recycling-workflows)
6. [Integration Setup](#integration-setup)
7. [Shop Floor Deployment](#shop-floor-deployment)
8. [Operations](#operations)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This implementation combines:
- **ERPNext**: Business operations (accounting, inventory, procurement)
- **Carbon**: Manufacturing execution (production, traceability, quality)
- **Xero**: Accounting integration (existing system)
- **Precoro**: Procurement integration (existing system)

### Key Features

| Feature | System | Description |
|---------|--------|-------------|
| Battery Receipt | Carbon | Inbound battery tracking with grading |
| Traceability | Carbon | Full batch genealogy through recycling |
| Work Orders | ERPNext → Carbon | Production order management |
| Quality Management | Carbon | Inspection plans and results |
| Material Recovery | Carbon | Recovered material tracking |
| Inventory | ERPNext | Stock management across warehouses |
| Accounting | Xero ↔ ERPNext | Bi-directional financial sync |
| Procurement | Precoro ↔ ERPNext | Purchase order automation |

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interfaces                           │
│   ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│   │  ERPNext     │  │  Carbon      │  │  Shop Floor UI      │  │
│   │  (Business)  │  │  (MES/QMS)   │  │  (React Tablets)    │  │
│   └──────────────┘  └──────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Integration Layer                            │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │           Node.js Integration Service                    │  │
│   │   - Xero Sync    - Precoro Sync    - ERPNext↔Carbon     │  │
│   └─────────────────────────────────────────────────────────┘  │
├──────────────────────────┬──────────────────────────────────────┤
│    External Systems      │       Data Layer                     │
│   ┌──────────────────┐   │   ┌──────────────────────────────┐  │
│   │  Xero Accounting │   │   │  MariaDB (ERPNext)           │  │
│   │  Precoro P2P     │   │   │  PostgreSQL (Carbon)         │  │
│   │  Banks           │   │   │  Redis (Cache/Queue)         │  │
│   └──────────────────┘   │   └──────────────────────────────┘  │
└──────────────────────────┴──────────────────────────────────────┘
```

### Data Flow

1. **Inbound Battery Flow:**
   ```
   Supplier → Precoro (PO) → Receipt (Carbon) → Inspection (Carbon) → 
   Storage (ERPNext) → Work Order (ERPNext) → Production (Carbon)
   ```

2. **Production Flow:**
   ```
   Work Order (ERPNext) → Carbon (Execution) → Material Consumption →
   Quality Check → Completed Goods (ERPNext)
   ```

3. **Financial Flow:**
   ```
   Sales Order (ERPNext) → Invoice (ERPNext) → Xero (Sync) → 
   Payment (Xero) → ERPNext (Reconcile)
   ```

---

## Installation

### Prerequisites

- Docker & Docker Compose
- 16GB+ RAM recommended
- 100GB+ storage
- Node.js 18+

### Quick Start

```bash
# Clone repository
cd /Users/cubiczan/battery-erp

# Copy environment file
cp .env.example .env

# Edit environment file with your credentials
# - Xero API keys
# - Precoro API key
# - Generate secure secrets

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start integration service
cd integrations
npm run dev

# Start shop floor UI (optional, for tablet deployment)
cd ../shop-floor
npm run dev
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| ERPNext | http://localhost:8080 | admin / admin123 |
| Carbon | http://localhost:3000 | (configured in setup) |
| Integration API | http://localhost:3001 | API key auth |
| Shop Floor UI | http://localhost:3002 | (SSO via ERPNext) |

---

## Configuration

### ERPNext Configuration

1. **Install Recycling Module:**
```bash
cd ~/frappe-bench/apps
ln -s /Users/cubiczan/battery-erp/erpnext/recycling recycling
bench --site erp.battery-recycling.local install-app recycling
bench migrate
```

2. **Create Warehouses:**
- Raw Materials (inbound batteries)
- WIP - Disassembly
- WIP - Processing
- Recovered Materials
- Hazardous Waste
- Finished Goods

3. **Create Item Groups:**
- Batteries (inbound)
- Recovered Materials
  - Cobalt Sulfate
  - Nickel Sulfate
  - Lithium Carbonate
  - Manganese Carbonate
- By-products
- Hazardous Waste

### Carbon Configuration

1. **Import Workflows:**
```bash
cd carbon
carbon workflow import ../carbon/workflows/inbound-processing.ts
carbon workflow import ../carbon/workflows/disassembly.ts
carbon workflow import ../carbon/workflows/material-recovery.ts
```

2. **Configure Quality Plans:**
- Inbound inspection plan
- In-process inspection plan
- Final product inspection plan

3. **Setup Traceability:**
- Enable batch genealogy
- Configure mass balance tracking
- Setup chain of custody requirements

### Integration Configuration

1. **Xero Integration:**
```bash
cd integrations
# Test Xero connection
curl http://localhost:3001/api/health/xero

# Run initial sync
curl -X POST http://localhost:3001/api/xero/sync \
  -H "Content-Type: application/json" \
  -d '{"options": {"syncAccounts": true, "syncContacts": true}}'
```

2. **Precoro Integration:**
```bash
# Test Precoro connection
curl http://localhost:3001/api/health/precoro

# Run initial sync
curl -X POST http://localhost:3001/api/precoro/sync \
  -H "Content-Type: application/json" \
  -d '{"options": {"syncVendors": true, "syncPurchaseOrders": true}}'
```

3. **ERPNext ↔ Carbon Sync:**
```bash
# Check sync status
curl http://localhost:3001/api/sync/status

# Trigger manual sync
curl -X POST http://localhost:3001/api/sync/trigger
```

---

## Battery Recycling Workflows

### Workflow 1: Battery Receipt

**Steps:**
1. Navigate to `/battery-receipt` in Shop Floor UI
2. Scan/enter supplier batch ID
3. Record:
   - Battery type (Li-ion, NiMH, etc.)
   - Quantity (number of packs/cells)
   - Weight (kg)
   - Visual condition
4. System assigns grade (A/B/C/D/Scrap)
5. Print barcode labels
6. Move to discharge area

**Quality Checks:**
- Voltage check (all cells)
- Physical damage assessment
- Leak detection

### Workflow 2: Disassembly

**Steps:**
1. Scan battery batch barcode
2. Record disassembly start
3. Complete each step:
   - Casing removal
   - Module extraction
   - Cell separation
   - Component sorting
4. Record output quantities:
   - Modules (kg)
   - Cells (kg)
   - BMS units (count)
   - Casing materials (kg)
5. Mark hazardous waste streams

**Quality Checks:**
- Visual inspection at each step
- Hazardous material identification

### Workflow 3: Material Recovery

**Steps:**
1. Scan material batch
2. Select recovery process:
   - Shredding
   - Physical separation
   - Hydrometallurgy
   - Refining
3. Record process parameters:
   - Temperature
   - Pressure
   - Chemical additions
   - Duration
4. Record output:
   - Recovered material type
   - Quantity
   - Purity
5. Quality inspection
6. Move to finished goods

**Quality Checks:**
- ICP-OES analysis
- Particle size distribution
- Moisture content
- Bulk density

---

## Integration Setup

### Xero Integration

**Data Synced:**
| Direction | Data Type | Frequency |
|-----------|-----------|-----------|
| Xero → ERPNext | Chart of Accounts | One-time + changes |
| Xero → ERPNext | Customers | Real-time |
| Xero → ERPNext | Suppliers | Real-time |
| Xero → ERPNext | Invoices | Real-time |
| Xero → ERPNext | Bills | Real-time |
| Xero → ERPNext | Payments | Real-time |
| ERPNext → Xero | Sales Invoices | Real-time |
| ERPNext → Xero | Purchase Invoices | Real-time |
| ERPNext → Xero | Payments | Real-time |

**Setup:**
1. Create OAuth2 app in Xero Developer Portal
2. Add credentials to `.env`
3. Configure webhook URL in Xero: `https://your-domain.com/api/webhooks/xero`
4. Run initial sync

### Precoro Integration

**Data Synced:**
| Direction | Data Type | Frequency |
|-----------|-----------|-----------|
| Precoro → ERPNext | Vendors | Real-time |
| Precoro → ERPNext | Purchase Orders | Real-time |
| Precoro → ERPNext | Shipments/Receipts | Real-time |
| ERPNext → Precoro | Requisitions | Real-time |
| ERPNext → Precoro | Approval decisions | Real-time |

**Setup:**
1. Generate API key in Precoro settings
2. Add credentials to `.env`
3. Configure webhook URL in Precoro: `https://your-domain.com/api/webhooks/precoro`
4. Run initial sync

### ERPNext ↔ Carbon Sync

**Data Synced:**
| Direction | Data Type | Trigger |
|-----------|-----------|---------|
| ERPNext → Carbon | Work Orders | On submit |
| Carbon → ERPNext | Production Results | On completion |
| Carbon → ERPNext | Material Consumption | On record |
| Carbon → ERPNext | Quality Inspections | On completion |

**Sync Interval:** 5 seconds (configurable)

---

## Shop Floor Deployment

### Tablet Setup

For each shop floor station:

1. **Hardware Requirements:**
   - Tablet (iPad/Android) or All-in-One PC
   - Barcode scanner (USB or Bluetooth)
   - Label printer (for barcode labels)
   - Network connection (WiFi or Ethernet)

2. **Software Setup:**
```bash
# On tablet/device, open browser to:
http://shop-floor-terminal:3002

# Or deploy as PWA:
# 1. Open in Chrome/Safari
# 2. Add to Home Screen
# 3. Launch as standalone app
```

3. **Station Configuration:**
   - Receipt Station: `/battery-receipt`
   - Disassembly Station: `/work-orders`
   - Quality Station: `/quality-check`
   - Recovery Station: `/material-recovery`

### Barcode System

**Barcode Format:** Code 128 or QR

**Label Types:**
- Battery Batch Label (inbound)
- Process Batch Label (WIP)
- Material Batch Label (recovered)
- Hazardous Waste Label

**Label Content:**
- Batch ID
- Material type
- Weight/quantity
- Date received/produced
- Current status
- QR code for quick scanning

---

## Operations

### Daily Operations

**Morning Checklist:**
1. Check dashboard for alerts
2. Review pending quality checks
3. Verify sync status (all systems green)
4. Review production schedule

**During Shift:**
1. Scan all inbound batteries
2. Record all production activities in real-time
3. Complete quality checks at each checkpoint
4. Monitor recovery rates

**End of Shift:**
1. Complete all open work orders
2. Reconcile physical counts with system
3. Review recovery rate reports
4. Handover notes for next shift

### Weekly Operations

1. **System Maintenance:**
   - Review sync logs
   - Check disk space
   - Review error logs
   - Backup verification

2. **Reporting:**
   - Weekly recovery rates by battery type
   - Production throughput analysis
   - Quality trends
   - Hazardous waste tracking summary

### Monthly Operations

1. **Performance Review:**
   - Overall Equipment Effectiveness (OEE)
   - Material recovery rate trends
   - Quality first-pass yield
   - Safety incidents

2. **System Updates:**
   - Apply security patches
   - Update documentation
   - Review and optimize workflows

---

## Troubleshooting

### Common Issues

**ERPNext not accessible:**
```bash
# Check container status
docker compose -f deploy/docker/erpnext.yml ps

# View logs
docker compose -f deploy/docker/erpnext.yml logs -f erpnext-backend

# Restart services
docker compose -f deploy/docker/erpnext.yml restart
```

**Sync failing:**
```bash
# Check sync status
curl http://localhost:3001/api/sync/status

# View integration logs
cd integrations
npm run dev  # Watch for errors

# Test individual connections
curl http://localhost:3001/api/health/erpnext
curl http://localhost:3001/api/health/carbon
curl http://localhost:3001/api/health/xero
curl http://localhost:3001/api/health/precoro
```

**Carbon not receiving work orders:**
1. Check ERPNext → Carbon sync is enabled
2. Verify API keys are correct
3. Check Carbon webhook endpoint
4. Review sync logs for errors

**Quality checks not syncing:**
1. Verify inspection type mapping
2. Check reference document exists in ERPNext
3. Review field mappings in integration config

### Support

- **Documentation:** `/docs` directory
- **Logs:** `docker compose logs -f`
- **Monitoring:** Grafana at http://localhost:3100
- **Emergency Contacts:** (add your team contacts)

---

## Appendix

### API Reference

See `integrations/README.md` for complete API documentation.

### Database Schema

See `docs/database-schema.md` for ERD and table descriptions.

### Custom Scripts

See `scripts/` directory for maintenance and utility scripts.

### Change Log

See `CHANGELOG.md` for version history and changes.
