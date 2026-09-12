# Prompt 6: Multi-Region Disaster Recovery with DynamoDB Global Tables & S3 Cross-Region Replication

## Metadata
- **AWS Services**: DynamoDB Global Tables, S3 Cross-Region Replication, Route 53, CloudFront, CloudFormation StackSets
- **Complexity**: Expert
- **Estimated Runtime Cost**: ~$95/month (DR infrastructure at moderate scale)
- **Category**: Disaster Recovery, High Availability

---

## The Prompt

```
You are an AWS Resilience Architect specializing in multi-region, active-active architectures for real-time data platforms. Design and implement a complete disaster recovery (DR) strategy for the MineScope Cloud critical mineral intelligence platform. The system must achieve RPO < 1 minute and RTO < 15 minutes for all critical data paths.

## Business Requirements

MineScope Cloud processes real-time commodity price data and generates AI-powered risk assessments for mining companies and financial institutions. Downtime during a supply chain disruption could result in:
- Missed trading opportunities (estimated $50K/hour for enterprise clients)
- Delayed risk response to geopolitical events
- Regulatory non-compliance (EU CSRD reporting requirements)

### DR Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| RPO (Recovery Point Objective) | < 1 minute | Maximum data loss acceptable |
| RTO (Recovery Time Objective) | < 15 minutes | Maximum downtime acceptable |
| Availability | 99.95% | Annual uptime target |
| Data Durability | 99.999999999% (11 nines) | For S3-stored data |
| Cross-Region Latency | < 200ms | For active-active writes |

### Region Selection

| Role | Region | Reason |
|------|--------|--------|
| Primary | us-east-1 (N. Virginia) | Closest to US financial markets, best Bedrock availability |
| Secondary | eu-west-1 (Ireland) | EU data residency compliance, serves European mining clients |
| Tertiary | ap-southeast-1 (Singapore) | Covers Asian mining operations (China, Indonesia, Australia) |

## Requirements

### 1. DynamoDB Global Tables (Active-Active Replication)

Create DynamoDB Global Tables for all critical tables:

a) **Global Table: minescope-latest-prices**:
   ```
   Regions: us-east-1, eu-west-1, ap-southeast-1
   
   Schema:
   - PK: mineral_id (String)
   - SK: timestamp (Number)
   
   Attributes: price, bid, ask, volume, ma_5m, ma_15m, ma_1h, source
   
   GSI "by-timestamp":
   - PK: timestamp (Number)
   - SK: mineral_id (String)
   
   TTL: enabled on timestamp (72 hours)
   
   Settings:
   - BillingMode: PAY_PER_REQUEST
   - SSE: AWS owned CMK (per region)
   - PointInTimeRecovery: enabled
   - StreamSpecification: NEW_AND_OLD_IMAGES (for Lambda triggers)
   ```

b) **Global Table: minescope-risk-scores**:
   ```
   Regions: us-east-1, eu-west-1, ap-southeast-1
   
   Schema:
   - PK: country_mineral (String)
   - SK: calculated_at (Number)
   
   Attributes: composite_score, geopolitical, environmental, regulatory,
               infrastructure, labor, concentration, assessment_id
   
   GSI "by-score":
   - PK: composite_score_range (String: "0-25", "25-50", "50-75", "75-100")
   - SK: country_mineral (String)
   
   Settings: Same as above
   ```

c) **Global Table: minescope-facility-status**:
   ```
   Regions: us-east-1, eu-west-1
   
   Schema:
   - PK: facility_id (String)
   - SK: updated_at (Number)
   
   Attributes: facility_name, country, mineral, status, utilization, capacity
   
   GSI "by-country":
   - PK: country (String)
   - SK: updated_at (Number)
   
   Settings: Same as above
   ```

d) **Conflict Resolution Strategy**:
   - DynamoDB Global Tables uses "last writer wins" (LWW) based on timestamps
   - Ensure all Lambda functions write consistent epoch millisecond timestamps
   - For risk_scores: include source_region attribute to trace conflict origins
   - Monitor replication lag via CloudWatch metrics:
     - ReplicationLatency (should be < 1 second)
     - InconsistentAccessCount (should be 0)
     - ThrottledRequests (alert if > 0)

### 2. S3 Cross-Region Replication (CRR)

Configure S3 CRR for all data lake buckets:

a) **Bucket Structure** (per region):

| Region | Raw Data Bucket | Analytics Bucket | Briefings Bucket |
|--------|----------------|-----------------|-----------------|
| us-east-1 | minescope-raw-data-us-east-1 | minescope-analytics-us-east-1 | minescope-briefings-us-east-1 |
| eu-west-1 | minescope-raw-data-eu-west-1 | minescope-analytics-eu-west-1 | minescope-briefings-eu-west-1 |
| ap-southeast-1 | minescope-raw-data-ap-southeast-1 | (read replica from us-east-1) | (read replica from us-east-1) |

b) **Replication Rules**:

For minescope-raw-data-us-east-1:
   ```json
   {
     "Role": "arn:aws:iam::ACCOUNT:role/minescope-crr-role",
     "Rules": [
       {
         "ID": "ReplicateAllToEU",
         "Status": "Enabled",
         "Priority": 1,
         "Filter": { "Prefix": "" },
         "Destination": {
           "Bucket": "arn:aws:s3:::minescope-raw-data-eu-west-1",
           "StorageClass": "S3-Standard",
           "EncryptionConfiguration": { "ReplicaKmsKeyID": "arn:aws:kms:eu-west-1:..." }
         },
         "DeleteMarkerReplication": { "Status": "Disabled" },
         "Metrics": {
           "Status": "Enabled",
           "EventThreshold": { "Minutes": 15 }
         }
       },
       {
         "ID": "ReplicateAllToAPAC",
         "Status": "Enabled",
         "Priority": 2,
         "Filter": { "Prefix": "" },
         "Destination": {
           "Bucket": "arn:aws:s3:::minescope-raw-data-ap-southeast-1",
           "StorageClass": "S3-Standard"
         }
       }
     ],
     "ReplicationTime": {
       "Status": "Enabled",
       "Time": { "Minutes": 5 }
     }
   }
   ```

c) **Replication Monitoring**:
   - CloudWatch Metrics: ReplicationLatency, OperationsFailed, BytesPendingReplication
   - Alert if ReplicationLatency > 5 minutes
   - Alert if OperationsFailed > 0 in any 5-minute window
   - Use S3 Replication Time Control (RTC) for SLA-backed replication (< 15 min RPO)

### 3. Route 53 Global Traffic Management

Configure Route 53 for multi-region routing:

a) **Health Checks**:
   - minescope-api-health-us-east-1: HTTPS health check on API endpoint, 30s interval, 3 failure threshold
   - minescope-api-health-eu-west-1: Same configuration
   - minescope-api-health-ap-southeast-1: Same configuration

b) **DNS Routing Policies**:

   Primary (Active-Active) Configuration:
   ```
   Record: api.minescope.cloud (A record, Alias)
   Routing Policy: Latency-based
   
   Targets:
   - us-east-1: CloudFront distribution → ALB → Lambda (weight: auto by latency)
   - eu-west-1: CloudFront distribution → ALB → Lambda (weight: auto by latency)
   - ap-southeast-1: CloudFront distribution → ALB → Lambda (weight: auto by latency)
   ```

   Failover Configuration (for dashboard — active-passive):
   ```
   Record: dashboard.minescope.cloud (A record, Alias)
   Routing Policy: Failover
   
   Primary:
   - eu-west-1 (QuickSight embedded dashboard, EU data residency)
   - Health check: minescope-dashboard-health-eu-west-1
   
   Secondary:
   - us-east-1 (fallback dashboard)
   - Health check: minescope-dashboard-health-us-east-1
   ```

c) **DNS Failover Automation**:
   - Lambda "route53-failover" triggered by CloudWatch alarm on health check failure
   - Automatic: If primary health check fails 3 consecutive times:
     1. Update Route 53 health check to unhealthy
     2. Traffic automatically routes to secondary (for failover records)
     3. SNS notification: "PRIMARY REGION DOWN — traffic rerouted to SECONDARY"
     4. CloudWatch metric: "FailoverEvent" with region details
   - Manual rollback: Lambda "route53-failback" for returning to primary after recovery

### 4. Lambda Multi-Region Deployment

Deploy pipeline Lambda functions to both us-east-1 and eu-west-1:

a) **Active-Active Functions** (run in both regions):
   - Price Aggregator: Both regions consume from their local Kinesis stream
   - Event Processor: Both regions process events independently
   - Supply Chain Processor: Both regions track facility status

b) **Write Strategy for Active-Active**:
   - Each region writes to its local DynamoDB Global Table endpoint
   - Global Tables handles replication automatically
   - For S3 writes: each region writes to its local bucket, CRR handles replication
   - Use AWS SDK endpoint configuration to ensure local region writes:
     ```typescript
     const ddb = new DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
     ```

c) **EventBridge Global**:
   - EventBridge buses are region-specific
   - Use EventBridge global endpoints for cross-region event routing:
     - Primary bus: minescope-data-bus in us-east-1
     - Replicate events to eu-west-1 via EventBridge cross-region
     - Alternatively: use SNS as a fan-out mechanism for cross-region events

### 5. Kinesis Cross-Region Data Sharing

For the real-time price stream:

a) **Option A: Enhanced Fan-Out per Region**:
   - Run separate Kinesis Data Streams in each region
   - Data producers write to their nearest region
   - Price data is not region-specific (all prices are global), so write to primary
   - Secondary regions read from Global Tables after aggregation

b) **Option B: Kinesis Data Firehose Cross-Region**:
   - Single Kinesis stream in us-east-1
   - Firehose delivery to S3 in eu-west-1 and ap-southeast-1
   - Use Firehose cross-region delivery

c) **Recommended**: Option A — Keep processing local, use Global Tables for read-after-write consistency

### 6. CloudFront Global Distribution

Configure CloudFront for global content delivery:

a) **Distribution: minescope-dashboard-cdn**:
   ```
   Origin: QuickSight embedded dashboard URL
   Behaviors:
     /dashboard/* → QuickSight origin (cached 5 min)
     /api/* → API Gateway in us-east-1 (no cache)
     /static/* → S3 origin minescope-static-assets (cached 1 day)
   
   Price Class: Use All Edge Locations (best latency)
   WAF: Associate with minescope-prod-waf WebACL (from Prompt 4)
   SSL: ACM certificate in us-east-1, auto-renew
   Origin Shield: Enabled in us-east-1 (reduce origin load)
   ```

b) **Distribution: minescope-api-cdn**:
   ```
   Origin: API Gateway regional endpoint (failover to secondary)
   Behaviors:
     /v1/prices/* → Price API (cached 60s for GET, no cache for POST)
     /v1/risks/* → Risk API (no cache — always fresh)
     /v1/alerts/* → Alert API (no cache)
   
   Lambda@Edge: Add region header to requests for routing
   Geo-restriction: None (global access)
   ```

### 7. Infrastructure as Code — StackSets

Deploy infrastructure across regions using CloudFormation StackSets:

a) **StackSet: minescope-data-plane** (deployed to us-east-1, eu-west-1, ap-southeast-1):
   - S3 buckets (raw data, analytics, briefings)
   - DynamoDB Global Tables (create in us-east-1, add replicas)
   - Kinesis Data Streams (per-region for active-active)
   - Lambda functions (pipeline processors)
   - IAM roles (regional)
   - CloudWatch alarms (regional)

b) **StackSet: minescope-security-plane** (deployed to all regions):
   - KMS keys (regional CMKs)
   - CloudTrail configuration
   - Config rules
   - Security Hub delegated resources

c) **StackSet: minescope-networking** (deployed to us-east-1, eu-west-1):
   - VPC with public/private/isolated subnets
   - VPC endpoints (S3 Gateway, DynamoDB, Kinesis)
   - NAT Gateways (1 per AZ)
   - Route tables and internet gateways

### 8. DR Testing & Validation

a) **Chaos Engineering with AWS Fault Injection Simulator (FIS)**:
   ```
   Experiment: "MineScope Regional Failover Test"
   
   Actions:
   1. Stop all Lambda functions in us-east-1 (simulating region outage)
   2. Verify eu-west-1 continues processing independently
   3. Check Route 53 health check triggers failover
   4. Verify CloudFront serves content from eu-west-1
   5. Verify DynamoDB Global Tables remain writable from eu-west-1
   6. Verify S3 CRR catches up within 5 minutes
   7. Restore us-east-1 functions
   8. Verify replication resyncs correctly
   ```

b) **Monthly DR Drill Schedule**:
   - First Saturday of each month: Non-destructive DR test (health check + failover)
   - Quarterly: Full regional failover test with FIS
   - Annually: Full disaster simulation (simulated region loss for 1 hour)

c) **DR Metrics Dashboard (CloudWatch)**:
   - Replication Lag (DynamoDB): target < 1 second
   - Replication Lag (S3 CRR): target < 5 minutes
   - Health Check Status (Route 53): target = healthy
   - Failover Events: target = 0
   - Cross-Region Latency: target < 200ms
   - Data Consistency Score: target = 100% (comparing record counts across regions)

### 9. Data Consistency Validation

Create Lambda "consistency-checker" (scheduled daily):

a) Compare record counts across DynamoDB Global Table replicas
b) Spot-check random records for consistency (read from each region, compare)
c. Compare S3 object lists across CRR destinations
d) Report any discrepancies to SNS "minescope-dr-alerts"
e) Store check results in S3: s3://minescope-dr/consistency-reports/{date}.json

## Output Requirements

Provide complete AWS CDK (TypeScript) code:
1. DynamoDB Global Table definitions with replicas
2. S3 Cross-Region Replication configuration for all buckets
3. Route 53 hosted zone, health checks, and routing policies
4. CloudFront distributions with origins, behaviors, and caching
5. Lambda multi-region deployment strategy
6. CloudFormation StackSets definitions for cross-region deployment
7. FIS experiment templates for DR testing
8. CloudWatch DR metrics dashboard
9. Consistency checker Lambda function
10. Step Functions automated DR test orchestrator
11. Complete runbook for manual failover procedures
12. RPO/RTO validation test plan
```

---

## What This Prompt Generates

| Component | AWS Service | Purpose |
|-----------|------------|---------|
| Active-Active DB | DynamoDB Global Tables | Multi-region data replication |
| Data Lake Replication | S3 Cross-Region Replication | Raw data geo-redundancy |
| Global DNS | Route 53 (Latency + Failover) | Automatic traffic routing |
| Global CDN | CloudFront (multi-origin) | Low-latency content delivery |
| Cross-Region IaC | CloudFormation StackSets | Consistent multi-region deployment |
| DR Testing | FIS + Step Functions | Automated failover validation |
| Consistency Monitoring | Lambda + CloudWatch | Data integrity verification |
| Regional Compute | Lambda (multi-region) | Active-active processing |

## DR Infrastructure Monthly Cost

| Service | Configuration | Monthly Cost |
|---------|--------------|-------------|
| DynamoDB Global Tables | 3 tables × 3 regions, on-demand | ~$25 |
| S3 CRR | ~50 GB × 2 replication destinations | ~$15 |
| S3 Storage (3 regions) | ~50 GB × 3 regions | ~$4.50 |
| Route 53 | Health checks + DNS queries | ~$5 |
| CloudFront | 1TB transfer, all edge locations | ~$35 |
| Lambda (multi-region) | 2× function instances | ~$5 |
| CloudWatch | Cross-region metrics | ~$6 |
| **Total DR Overhead** | | **~$95.50/month** |

## RPO/RTO Guarantee

| Component | RPO | RTO | Method |
|-----------|-----|-----|--------|
| DynamoDB (prices, risks) | < 1 second | < 1 minute | Global Tables (active-active) |
| S3 (raw events, articles) | < 5 minutes | < 15 minutes | CRR with RTC |
| API Endpoints | N/A | < 2 minutes | Route 53 failover |
| Dashboard | N/A | < 5 minutes | CloudFront + QuickSight failover |
| Lambda Processing | < 1 minute | < 2 minutes | Multi-region deployment |
