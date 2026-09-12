# Prompt 1: Real-Time Critical Mineral Data Pipeline with AWS Lambda & EventBridge

## Metadata
- **AWS Services**: Lambda, EventBridge, SQS, Kinesis Data Streams, S3, CloudWatch, SNS
- **Complexity**: Advanced
- **Estimated Runtime Cost**: ~$45/month at moderate scale
- **Category**: Data Ingestion & Stream Processing

---

## The Prompt

```
You are an AWS Solutions Architect specializing in real-time data pipelines for commodity markets. Build a complete, production-grade serverless data pipeline on AWS that ingests, transforms, and stores critical mineral commodity data (lithium, cobalt, nickel, rare earth elements, copper) from multiple sources in real-time.

## Requirements

### 1. Data Sources (simulate with mock data generators)
Create three Lambda functions that simulate data ingestion from:

a) **Commodity Price Feeds** — Simulate real-time price tick data:
   - Minerals: Lithium ($/kg), Cobalt ($/lb), Nickel ($/lb), Rare Earths ($/kg), Copper ($/lb)
   - Emit price ticks every 5-30 seconds with realistic micro-variations (±0.1-2%)
   - Include bid/ask spread, volume, timestamp, source exchange ID
   - Data format: JSON with fields: { mineral_id, price, bid, ask, volume, timestamp, source, currency }

b) **Geopolitical Event Stream** — Simulate news/event data:
   - Event types: trade_policy, sanctions, export_ban, mine_disruption, regulatory_change, diplomatic_event
   - Severity: low (1-3), medium (4-6), high (7-8), critical (9-10)
   - Affected countries, minerals, supply_impact_estimate (percentage)
   - Emit 1-5 events per minute during simulation

c) **Supply Chain Status Updates** — Simulate operational data:
   - Mine status: operational, reduced, shutdown, maintenance
   - Port/logistics status: normal, delayed, congested, closed
   - Processing facility utilization: 0-100%
   - Emit updates every 30-60 seconds for 10 simulated facilities

### 2. EventBridge Bus Architecture
- Create a custom EventBridge bus named "minescope-data-bus"
- Define event patterns/rules for routing:
  - Rule "price-ticks" → route all price data to Kinesis Data Stream "price-stream"
  - Rule "geo-events-high-severity" → route events with severity >= 7 to SQS queue "critical-alerts-queue" AND SNS topic "geo-alerts"
  - Rule "geo-events-all" → route all geopolitical events to Kinesis "event-stream"
  - Rule "supply-chain-updates" → route supply chain data to Kinesis "supply-stream"
  - Rule "dead-letter" → catch-all for unmatched events → DLQ

### 3. Stream Processing with Kinesis + Lambda
Create Lambda consumer functions for each Kinesis stream:

a) **Price Aggregator Lambda**:
   - Consume from "price-stream" in batches of 100-500 records
   - Aggregate ticks into 1-minute OHLCV candles (Open, High, Low, Close, Volume)
   - Calculate moving averages (5-min, 15-min, 1-hour) using a rolling window
   - Detect price spikes: if price moves > 3% in any 5-minute window, emit alert event to EventBridge
   - Store candles in S3 partition: s3://minescope-raw-data/price-candles/{mineral_id}/{year}/{month}/{day}/
   - Store latest aggregated prices in DynamoDB table "minescope-latest-prices" (PK: mineral_id, SK: timestamp)

b) **Event Processor Lambda**:
   - Consume from "event-stream"
   - Enrich events with country metadata from DynamoDB "minescope-country-metadata" table
   - Calculate supply impact score: affected_production_volume × severity_weight × duration_estimate
   - Store enriched events in S3: s3://minescope-raw-data/geo-events/{year}/{month}/{day}/
   - Update risk scores in DynamoDB "minescope-risk-scores" table

c) **Supply Chain Processor Lambda**:
   - Consume from "supply-stream"
   - Track facility status changes and calculate availability metrics
   - If any top-5 producing facility changes to "shutdown" or "reduced", emit alert
   - Store in S3: s3://minescope-raw-data/supply-status/{year}/{month}/{day}/
   - Update DynamoDB "minescope-facility-status" table

### 4. DynamoDB Tables
Create with Terraform or AWS CDK (TypeScript):

a) **minescope-latest-prices**:
   - Partition key: mineral_id (String)
   - Sort key: timestamp (Number)
   - Attributes: price, bid, ask, volume, ma_5m, ma_15m, ma_1h, source
   - TTL: 72 hours on timestamp attribute
   - GSI: "by-timestamp" (SK as PK, mineral_id as SK) for time-range queries

b) **minescope-risk-scores**:
   - Partition key: country_mineral (String, e.g., "DRC_lithium")
   - Sort key: calculated_at (Number)
   - Attributes: composite_score, geopolitical, environmental, regulatory, infrastructure, labor, concentration
   - GSI: "by-score" for top-risk queries

c) **minescope-facility-status**:
   - Partition key: facility_id (String)
   - Sort key: updated_at (Number)
   - Attributes: facility_name, country, mineral, status, utilization, capacity
   - GSI: "by-country" for country-level aggregation

### 5. Dead Letter Queue & Error Handling
- Create SQS DLQ "minescope-pipeline-dlq" with 14-day retention
- Configure all Lambda functions with DLQ targeting
- On processing failure: log to CloudWatch, send to DLQ, increment CloudWatch metric "PipelineErrors"
- Circuit breaker: if error rate > 10% in 5 minutes, emit EventBridge event "pipeline-degradation"

### 6. CloudWatch Monitoring
Create CloudWatch alarms for:
- Lambda errors > 5 in 5 minutes → SNS notification
- Kinesis IteratorAge > 1 hour → SNS notification
- SQS queue depth > 1000 messages → SNS notification (scale up consumers)
- DLQ message count > 0 → SNS notification (immediate investigation)
- Lambda duration P99 > 80% of timeout → SNS notification

### 7. SNS Alerting
- Topic "minescope-alerts" with email and HTTPS endpoint subscriptions
- Alert messages include: event_type, severity, affected_minerals, timestamp, supply_impact_estimate, recommended_action
- Rate limiting: max 10 alerts per minute to prevent notification fatigue

### 8. Cost Optimization
- Use Lambda Powertools for efficient batching and partial batch failure handling
- Set Kinesis shard count based on expected throughput (start with 2 shards)
- Enable S3 Intelligent-Tiering for raw data storage
- Use Graviton2 (arm64) for Lambda functions (20% cost reduction)
- Configure reserved concurrency for critical path functions

## Output Requirements

Provide complete, deployable code in AWS CDK (TypeScript) that includes:
1. All infrastructure definitions (stack constructs)
2. All Lambda function code (TypeScript/Node.js 20.x)
3. IAM roles with least-privilege permissions
4. EventBridge rules and targets
5. DynamoDB table definitions with GSIs and TTL
6. CloudWatch alarms and dashboards
7. SNS topics and subscriptions
8. A deployment script (cdk deploy) with environment variables
9. A README with setup instructions, testing procedure, and cost estimates

The pipeline must handle at least 1,000 events/second with P99 latency under 2 seconds for the processing path.
```

---

## What This Prompt Generates

| Component | AWS Service | Purpose |
|-----------|------------|---------|
| 3 Ingestion Lambdas | Lambda (Node.js 20, arm64) | Simulate price, event, and supply chain data |
| Event Bus | EventBridge Custom Bus | Route events by type and severity |
| 3 Stream Processors | Lambda + Kinesis | Aggregate prices, enrich events, track facilities |
| 3 DynamoDB Tables | DynamoDB + GSIs + TTL | Store latest prices, risk scores, facility status |
| Raw Data Lake | S3 + Intelligent-Tiering | Immutable event storage partitioned by date |
| Alert System | SNS + SQS DLQ | Critical notifications with dead-letter handling |
| Monitoring | CloudWatch Alarms + Metrics | Operational visibility and auto-alerting |
| IaC | AWS CDK (TypeScript) | Complete infrastructure-as-code deployment |

## Expected Monthly Cost (Moderate Scale)

| Service | Configuration | Monthly Cost |
|---------|--------------|-------------|
| Lambda | 4 functions × ~500K invocations | ~$12 |
| Kinesis | 2 shards × 730 hours | ~$18 |
| DynamoDB | 3 tables, on-demand | ~$8 |
| S3 | ~50 GB storage (Intelligent-Tiering) | ~$1.50 |
| EventBridge | ~2M events | ~$2 |
| SNS + SQS | 10K notifications | ~$0.50 |
| CloudWatch | Metrics + alarms | ~$3 |
| **Total** | | **~$45/month** |
