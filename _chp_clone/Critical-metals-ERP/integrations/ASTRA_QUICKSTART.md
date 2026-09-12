# Astra DB Quick Start

## ✅ Your Credentials Are Configured

Your Astra DB credentials have been saved to `.env`:

```
Database ID: 681b37e7-5b0c-4430-abb6-0a56baca307f
Keyspace: battery_erp
```

## 🚀 Quick Test

```bash
cd /Users/cubiczan/battery-erp/integrations

# Install dependencies
npm install

# Test Astra DB connection
npm run test:astra
```

Expected output:
```
✅ Successfully connected to Astra DB!
✅ Write test successful!
✅ Read test successful!
🎉 All tests passed! Astra DB is ready.
```

## 📡 API Endpoints

Once the integration service is running (`npm run dev`):

```bash
# Check connection status
curl http://localhost:3001/api/astra/health

# Record production event
curl -X POST http://localhost:3001/api/astra/events \
  -H "Content-Type: application/json" \
  -d '{
    "work_order_id": "WO-001",
    "batch_id": "BATCH-001",
    "event_type": "work_started",
    "station_id": "DISASSEMBLY-1",
    "operator_id": "OP-123"
  }'

# Get batch traceability
curl http://localhost:3001/api/astra/traceability/BATCH-001
```

## 🔐 Security Notes

⚠️ **Important:** Your `.env` file contains sensitive credentials:
- Never commit `.env` to version control
- The `.gitignore` file is configured to exclude it
- Rotate credentials if they are ever exposed

## 📊 What's Stored in Astra DB

| Data Type | Example | Retention |
|-----------|---------|-----------|
| Production Events | Work order started, completed | 1 year |
| Batch Genealogy | Battery receipt, tracking | Permanent |
| Quality Records | Inspection results | Permanent |
| Material Recovery | Cobalt/Nickel recovered | Permanent |
| Production Metrics | Daily throughput | Permanent |
| Sensor Readings | Temperature, pressure | 30 days |

## 🔧 Connection Details

```
Contact Point: 681b37e7-5b0c-4430-abb6-0a56baca307f-us-east2.apps.astra.datastax.com
Datacenter: us-east-2
Protocol: Cassandra (CQL)
Auth: Token-based
```

## 🛠️ Troubleshooting

**Connection fails:**
1. Check database is active in [Astra Console](https://cloud.datastax.com/)
2. Verify your IP is allowlisted
3. Check credentials in `.env` match your Astra dashboard

**Queries timeout:**
- Check network connectivity
- Verify firewall allows outbound HTTPS (port 443)

**Schema not created:**
- Tables are auto-created on first connect
- Check logs for any errors

## 📖 Full Documentation

- `/Users/cubiczan/battery-erp/integrations/ASTRA_DB_SETUP.md`
- [Astra DB Docs](https://docs.datastax.com/en/astra-db-serverless/)
