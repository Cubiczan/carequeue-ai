# Astra DB Integration Guide

## Overview

Your Astra DB instance (`681b37e7-5b0c-4430-abb6-0a56baca307f`) is now integrated into the Battery ERP stack for:

- **Time-series data**: Production events, sensor readings
- **Traceability**: Batch genealogy across the recycling process
- **Analytics**: Aggregated production metrics
- **Quality records**: Inspection results and readings
- **Material recovery**: Tracking recovered materials by batch

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│   Shop Floor UI │ Integration API │ Analytics Dashboard │
├─────────────────────────────────────────────────────────┤
│                    Integration Layer                     │
│   ┌─────────────────────────────────────────────────┐  │
│   │          Astra DB Client (cassandra-driver)     │  │
│   └─────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                      Astra DB                            │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│   │production│ │  batch   │ │ quality  │ │ material │ │
│   │ _events  │ │genealogy │ │ _records │ │_recovery │ │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│   │production│ │ operator │ │  sensor  │              │
│   │ _metrics │ │ _activity│ │ _readings│              │
│   └──────────┘ └──────────┘ └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

| Table | Purpose | Retention |
|-------|---------|-----------|
| `production_events` | Time-series of all production activities | 1 year |
| `batch_genealogy` | Complete batch tracking & chain of custody | Permanent |
| `quality_records` | Quality inspection results | Permanent |
| `material_recovery` | Recovered materials tracking | Permanent |
| `production_metrics` | Daily aggregated metrics | Permanent |
| `operator_activity` | Operator actions & productivity | 90 days |
| `sensor_readings` | IoT sensor data from equipment | 30 days |

## Setup

### 1. Get Astra DB Credentials

From your Astra DB instance `681b37e7-5b0c-4430-abb6-0a56baca307f`:

1. Log into [Astra DB Control Center](https://cloud.datastax.com/)
2. Select your database
3. Go to **Connect** tab
4. Download secure connect bundle OR note:
   - Contact Point (API endpoint)
   - Keyspace name
   - Username/Password (create if needed)

### 2. Configure Environment

Update `.env` file:

```bash
# Astra DB Configuration
ASTRA_DB_ID=681b37e7-5b0c-4430-abb6-0a56baca307f
ASTRA_KEYSPACE=battery_erp
ASTRA_USERNAME=your_username
ASTRA_PASSWORD=your_password
ASTRA_CONTACT_POINT=681b37e7-5b0c-4430-abb6-0a56baca307f-us-east2.apps.astra.datastax.com
ASTRA_DATACENTER=us-east-2
```

### 3. Install Dependencies

```bash
cd /Users/cubiczan/battery-erp/integrations
npm install
```

### 4. Start Integration Service

```bash
npm run dev

# Verify Astra DB connection
curl http://localhost:3001/api/astra/health
```

## API Endpoints

### Production Events

```bash
# Record production event
POST /api/astra/events
{
  "work_order_id": "WO-001",
  "batch_id": "BATCH-001",
  "event_type": "work_started",
  "station_id": "DISASSEMBLY-1",
  "operator_id": "OP-123",
  "data": { "notes": "Normal operation" },
  "metrics": { "temperature": 25.5, "humidity": 45 }
}

# Get events for work order
GET /api/astra/events/WO-001?limit=100
```

### Batch Genealogy

```bash
# Record/update batch
POST /api/astra/batches
{
  "batch_id": "BATCH-001",
  "parent_batch_id": "BATCH-PARENT-001",
  "battery_type": "Li-ion NMC",
  "supplier": "Supplier ABC",
  "receipt_date": "2024-01-15T10:00:00Z",
  "current_status": "in_process",
  "current_location": "DISASSEMBLY-1",
  "weight_kg": 500.0,
  "process_history": ["receipt", "inspection", "disassembly"]
}

# Get batch details
GET /api/astra/batches/BATCH-001
```

### Quality Records

```bash
# Record quality inspection
POST /api/astra/quality
{
  "batch_id": "BATCH-001",
  "work_order_id": "WO-001",
  "item_code": "COB-001",
  "inspection_type": "In Process",
  "inspection_date": "2024-01-15T14:00:00Z",
  "status": "Pass",
  "readings": [
    {"specification": "Purity", "value": "99.5%", "status": "Pass"},
    {"specification": "Moisture", "value": "0.05%", "status": "Pass"}
  ],
  "inspector_id": "QC-001"
}
```

### Material Recovery

```bash
# Record recovered material
POST /api/astra/recovery
{
  "batch_id": "BATCH-001",
  "process_stage": "hydrometallurgy",
  "material_type": "Cobalt Sulfate",
  "quantity_kg": 125.5,
  "purity_percent": 99.2,
  "warehouse": "Recovered Materials"
}

# Get recovery by batch
GET /api/astra/recovery/BATCH-001
```

### Production Metrics

```bash
# Update daily metrics
POST /api/astra/metrics
{
  "date": "2024-01-15",
  "work_orders_completed": 5,
  "total_quantity": 2500,
  "avg_recovery_rate": 94.5,
  "total_input_kg": 5000,
  "total_output_kg": 4725,
  "waste_kg": 275,
  "downtime_minutes": 45,
  "quality_pass_rate": 98.2
}

# Get metrics for date range
GET /api/astra/metrics?startDate=2024-01-01&endDate=2024-01-31
```

### Sensor Readings

```bash
# Record sensor reading
POST /api/astra/sensors
{
  "sensor_id": "TEMP-SENSOR-001",
  "metric_name": "temperature",
  "metric_value": 45.2,
  "unit": "celsius",
  "station_id": "SHREDDER-1"
}

# Get recent readings
GET /api/astra/sensors/TEMP-SENSOR-001?metricName=temperature&limit=100
```

### Complete Traceability

```bash
# Get full traceability chain
GET /api/astra/traceability/BATCH-001

# Response includes:
{
  "genealogy": {...},
  "recovery": [...],
  "events": [...],
  "mass_balance": {
    "input_kg": 500,
    "recovered_kg": 472.5,
    "waste_kg": 27.5,
    "recovery_rate": 94.5
  }
}
```

## Data Models

### Production Event
```typescript
{
  event_id: timeuuid,        // Auto-generated
  work_order_id: text,
  batch_id: text,
  event_type: text,          // work_started, work_completed, material_consumed, etc.
  station_id: text,
  operator_id: text,
  timestamp: timestamp,
  data: map<text, text>,     // Flexible event-specific data
  metrics: map<text, double> // Numeric measurements
}
```

### Batch Genealogy
```typescript
{
  batch_id: text,            // Primary key
  parent_batch_id: text,     // Parent batch (for splits/merges)
  battery_type: text,        // Li-ion, NiMH, etc.
  supplier: text,
  receipt_date: timestamp,
  current_status: text,      // received, inspecting, in_process, completed
  current_location: text,    // Current station/warehouse
  weight_kg: double,
  process_history: list<text>,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Material Recovery
```typescript
{
  recovery_id: timeuuid,     // Auto-generated
  batch_id: text,
  process_stage: text,       // shredding, separation, hydrometallurgy, refining
  material_type: text,       // Cobalt Sulfate, Nickel Sulfate, etc.
  quantity_kg: double,
  purity_percent: double,
  warehouse: text,
  recorded_at: timestamp
}
```

## Integration with Shop Floor UI

The Shop Floor UI automatically uses Astra DB when available:

1. **Battery Receipt** → Creates batch genealogy record
2. **Work Order Start/Complete** → Records production events
3. **Quality Check** → Stores inspection records
4. **Material Recovery** → Tracks recovered materials
5. **Traceability View** → Displays data from Astra DB

## Analytics & Reporting

### Example Queries (via CQL)

```sql
-- Get all batches from a supplier
SELECT * FROM batch_genealogy WHERE supplier = 'Supplier ABC';

-- Get production events for a date range
SELECT * FROM production_events 
WHERE work_order_id IN ('WO-001', 'WO-002')
AND timestamp >= '2024-01-01';

-- Get material recovery by type
SELECT material_type, SUM(quantity_kg) as total_kg
FROM material_recovery
GROUP BY material_type;

-- Get average recovery rate by battery type
SELECT battery_type, AVG(recovery_rate) as avg_rate
FROM batch_genealogy bg
JOIN material_recovery mr ON bg.batch_id = mr.batch_id
GROUP BY battery_type;
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/api/astra/health

# Response:
{
  "success": true,
  "status": "connected",
  "keyspace": "battery_erp"
}
```

### Metrics to Watch

- Connection pool usage
- Query latency (p50, p95, p99)
- Read/write throughput
- Storage usage per table

## Backup & Recovery

Astra DB provides:
- **Automatic backups**: Point-in-time recovery
- **Geo-replication**: Multi-region availability
- **Retention policies**: Configurable per table

For manual exports:

```bash
# Use cqlsh to export data
cqlsh <contact-point> <keyspace> -u <username> -p <password> -e "COPY production_events TO STDOUT;"
```

## Cost Optimization

- **TTL settings**: Auto-expire old data (sensor data: 30 days)
- **Data compaction**: Optimize storage
- **Query patterns**: Use proper partition keys to avoid full table scans

## Security

- **Authentication**: Username/password via Astra
- **Encryption**: TLS in transit, encryption at rest
- **Network**: Allowlist your server IPs in Astra DB console
- **Secrets**: Store credentials in `.env` (not in version control)

## Troubleshooting

### Connection Issues

```bash
# Check Astra DB status in cloud console
# Verify contact point and credentials
# Ensure your IP is allowlisted

# Test connection directly
npm install cassandra-driver
node -e "
const { Client } = require('cassandra-driver');
const client = new Client({
  contactPoints: ['your-contact-point'],
  localDataCenter: 'us-east-2',
  credentials: { username: 'user', password: 'pass' }
});
client.connect().then(() => console.log('Connected!'));
"
```

### Query Errors

- Check keyspace name matches
- Verify table exists (schema is auto-created on first connect)
- Review CQL syntax for Cassandra

## Next Steps

1. **Configure your Astra DB credentials** in `.env`
2. **Start the integration service**: `npm run dev`
3. **Test connection**: `curl http://localhost:3001/api/astra/health`
4. **Record first event**: Use the POST endpoints above
5. **View in Astra DB console**: Verify data appears

## Resources

- [Astra DB Docs](https://docs.datastax.com/en/astra-db-serverless/)
- [Cassandra CQL Reference](https://cassandra.apache.org/doc/stable/cassandra/cql/index.html)
- [cassandra-driver npm](https://www.npmjs.com/package/cassandra-driver)
