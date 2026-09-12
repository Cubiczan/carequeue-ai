# Prompt 5: FinOps Cost Optimization with AWS Cost Explorer & Budgets

## Metadata
- **AWS Services**: Cost Explorer, Budgets, Cost and Usage Report (CUR), Anomaly Detection, Lambda, CloudWatch
- **Complexity**: Intermediate
- **Estimated Runtime Cost**: ~$5/month (for FinOps tooling itself)
- **Category**: Cost Management, Financial Operations

---

## The Prompt

```
You are an AWS FinOps Practitioner specializing in AI/ML workloads and real-time data pipelines. Build a comprehensive cost optimization and financial operations framework for the MineScope Cloud platform. The platform runs a real-time commodity data pipeline (Lambda + Kinesis + EventBridge), AI-powered risk analysis (Bedrock + Claude), and interactive dashboards (QuickSight + Athena). The total monthly AWS spend target is under $200/month for moderate scale, scaling to under $800/month at peak.

## Current Architecture Cost Profile (Estimated)

| Service | Monthly Cost (Moderate) | Monthly Cost (Peak) |
|---------|------------------------|---------------------|
| Lambda | $12 | $45 |
| Kinesis Data Streams | $18 | $72 |
| DynamoDB | $8 | $25 |
| S3 | $1.50 | $10 |
| EventBridge | $2 | $8 |
| Bedrock (Claude) | $45 | $180 |
| QuickSight | $24 | $250 |
| Athena | $5 | $20 |
| Glue | $3 | $10 |
| Comprehend | $5 | $15 |
| Translate | $2 | $8 |
| CloudWatch | $3 | $10 |
| Security (Hub/GuardDuty/KMS) | $26 | $26 |
| **Total** | **~$155** | **~$679** |

## Requirements

### 1. AWS Budgets Configuration

Create the following budgets using AWS CDK:

a) **Total Account Budget**:
   - Budget limit: $200/month (moderate), $800/month (peak — create both)
   - Alert thresholds: 50% ($100), 75% ($150), 90% ($180), 100% ($200)
   - Alert type: ACTUAL (not forecasted)
   - Notification: SNS to "minescope-finops-alerts" topic
   - At 90%: also trigger Lambda "cost-saver" to apply defensive measures

b) **Service-Specific Budgets**:

| Budget Name | Service | Monthly Limit | Alerts |
|-------------|---------|--------------|--------|
| bedrock-ml-budget | Bedrock | $50 | 60%, 80%, 100% |
| quicksight-bi-budget | QuickSight | $30 | 80%, 100% |
| kinesis-streaming-budget | Kinesis | $25 | 80%, 100% |
| lambda-compute-budget | Lambda | $20 | 80%, 100% |
| athena-query-budget | Athena | $10 | 80%, 100% |
| data-storage-budget | S3 + DynamoDB | $15 | 80%, 100% |

c) **RI/Savings Plans Coverage Budget**:
   - Target: 70% of Lambda + Bedrock spend covered by Commitment Discounts
   - Alert if coverage drops below 50%

### 2. Cost Anomaly Detection

Configure AWS Cost Anomaly Detection:

a) **Monitor for Bedrock Spend**:
   - Monitor type: Service (Amazon Bedrock)
   - Threshold: 50% above average daily spend
   - Alert SNS: "minescope-finops-alerts"
   - Auto-response: If anomaly detected, Lambda "bedrock-governor" reduces analysis frequency

b) **Monitor for Kinesis Throughput**:
   - Monitor type: Service (Amazon Kinesis)
   - Threshold: 100% above baseline
   - Alert: SNS + PagerDuty integration
   - Root cause: Check for data producer misconfiguration or DDoS-like pattern

c) **Monitor for Data Transfer**:
   - Monitor type: Usage type (DataTransfer)
   - Threshold: 200% above baseline
   - Root cause check: S3 cross-region replication costs, Athena scanning too much data

### 3. Cost Optimization Lambda Functions

Create the following Lambda functions:

a) **cost-saver** (triggered by 90% budget alert):
   ```typescript
   // Triggered by SNS from AWS Budgets
   // Defensive measures to reduce spend when approaching limit
   
   export const handler = async (event: any) => {
     const actions = [
       // 1. Reduce Bedrock analysis frequency (skip low-confidence articles)
       'Update Lambda environment variable ANALYSIS_MIN_CONFIDENCE to "high"',
       // 2. Reduce Kinesis shard count if possible
       'Describe Kinesis streams and evaluate shard reduction',
       // 3. Reduce QuickSight SPICE refresh frequency
       'Update SPICE refresh from 15min to 1hour',
       // 4. Reduce Lambda provisioned concurrency to 0
       'Set all Lambda provisioned concurrency to 0',
       // 5. Enable S3 Intelligent-Tiering if not already
       'Apply lifecycle policy to move old data to cheaper tiers',
       // 6. Stop non-critical development resources
       'Tag and stop dev environment EC2 instances if any',
     ];
     
     // Execute defensive actions in priority order
     // Log all actions taken to CloudWatch
     // Send summary notification via SNS
   };
   ```

b) **bedrock-governor** (triggered by Bedrock anomaly or budget):
   ```typescript
   export const handler = async (event: any) => {
     // Analyze Bedrock spend pattern
     // Implement token budgeting:
     // - Daily token budget: 500K input + 200K output tokens
     // - Track usage via CloudWatch metrics
     // - When budget reached 80%: skip articles with relevance_score < 0.5
     // - When budget reached 95%: stop all analysis until next day
     
     // Optimization strategies:
     // 1. Pre-filter articles by Comprehend entity relevance before sending to Claude
     // 2. Batch related articles for combined analysis (3-5 articles per prompt)
     // 3. Use Claude Haiku for low-relevance articles (< 0.3 relevance_score)
     //    ($0.25/1K input vs $3/1K input for Sonnet — 12x cheaper)
     // 4. Cache Claude responses for similar articles (avoid re-analyzing duplicate news)
   };
   ```

c) **right-sizing-analyzer** (scheduled weekly via EventBridge):
   ```typescript
   export const handler = async (event: any) => {
     // Analyze resource utilization and generate right-sizing recommendations
     
     // 1. Lambda right-sizing:
     //    - Review memory settings: are functions over-provisioned?
     //    - Review timeout settings: are timeouts too generous?
     //    - Review provisioned concurrency: is it necessary?
     //    - Recommendation: "Reduce Price Aggregator memory from 1024MB to 512MB"
     
     // 2. Kinesis right-sizing:
     //    - Review shard utilization (GetMetricsStatistics)
     //    - If max IteratorAge < 5min consistently, recommend shard reduction
     //    - Recommendation: "Reduce price-stream from 4 shards to 2 shards"
     
     // 3. DynamoDB right-sizing:
     //    - Review consumed vs provisioned capacity
     //    - Check for hot keys causing throttling
     //    - Recommendation: "Switch from provisioned to on-demand for tables 
     //      with < 50% utilization"
     
     // 4. S3 right-sizing:
     //    - Review storage class distribution
     //    - Identify data in Standard that hasn't been accessed in 30+ days
     //    - Recommendation: "Move 12 GB of price_candles data to S3-IA"
     
     // 5. QuickSight right-sizing:
     //    - Review SPICE storage utilization
     //    - Check reader session hours
     //    - Recommendation: "Reduce SPICE refresh from 15min to 30min for 
     //      geo_events (low update frequency)"
     
     // Generate report and store in S3: s3://minescope-finops/reports/{date}.json
     // Send summary via SNS
   };
   ```

d) **cost-forecast** (scheduled daily via EventBridge):
   ```typescript
   export const handler = async (event: any) => {
     // Use Cost Explorer API to generate month-end forecast
     
     // 1. Get current month-to-date spend per service
     // 2. Get forecast for remaining days of month
     // 3. Calculate projected total and compare to budget
     // 4. Identify fastest-growing services (week-over-week delta)
     // 5. Calculate burn rate (daily average spend)
     // 6. Predict budget exhaustion date
     
     // Output format:
     // {
     //   "report_date": "2026-04-15",
     //   "mtd_spend": "$89.50",
     //   "forecast_total": "$195.20",
     //   "budget": "$200.00",
     //   "budget_remaining": "$110.50",
     //   "burn_rate": "$5.97/day",
     //   "projected_exhaustion": "2026-04-29",
     //   "top_spenders": [
     //     {"service": "Amazon Bedrock", "spend": "$42.30", "pct_change": "+12%"},
     //     {"service": "Amazon QuickSight", "spend": "$18.50", "pct_change": "+3%"},
     //     {"service": "Amazon Kinesis", "spend": "$12.00", "pct_change": "-5%"}
     //   ],
     //   "recommendations": [
     //     "Bedrock spend trending +12% WoW. Consider using Claude Haiku for 
     //      low-relevance articles to reduce cost by ~$15/month",
     //     "Kinesis spend decreasing (-5%). Evaluate shard reduction from 4 to 3"
     //   ]
     // }
   };
   ```

### 4. Cost and Usage Report (CUR)

Configure CUR for detailed cost analysis:

a) **CUR Setup**:
   - Report name: "minescope-cur"
   - S3 bucket: s3://minescope-finops/cur/
   - Granularity: Hourly
   - Format: Parquet (for Athena querying)
   - Include: Resource IDs, Tags, Savings Plans, RI utilization
   - Report versioning: Overwrite
   - Time granularity: HOURLY for detailed analysis

b) **Athena Table for CUR Analysis**:
   ```sql
   CREATE EXTERNAL TABLE minescope_cur (
     identity_line_item_id STRING,
     identity_time_interval STRING,
     bill_payer_account_id STRING,
     line_item_usage_account_id STRING,
     line_item_product_code STRING,
     line_item_usage_type STRING,
     line_item_operation STRING,
     line_item_resource_id STRING,
     line_item_usage_amount DOUBLE,
     line_item_unblended_cost DOUBLE,
     line_item_blended_cost DOUBLE,
     line_item_net_cost DOUBLE,
     pricing_unit STRING,
     tags JSON
   )
   PARTITIONED BY (year STRING, month STRING)
   STORED AS PARQUET
   LOCATION 's3://minescope-finops/cur/';
   ```

c) **Pre-built FinOps Queries**:

   Query 1: Cost by Service (Last 30 Days)
   ```sql
   SELECT line_item_product_code,
          SUM(line_item_unblended_cost) as total_cost,
          SUM(line_item_usage_amount) as total_usage,
          SUM(line_item_unblended_cost) / SUM(line_item_usage_amount) as unit_cost
   FROM minescope_cur
   WHERE year = '2026' AND month = '04'
   GROUP BY line_item_product_code
   ORDER BY total_cost DESC;
   ```

   Query 2: Cost by Resource Tag
   ```sql
   SELECT tags['Environment'] as environment,
          tags['Service'] as service,
          line_item_product_code,
          SUM(line_item_unblended_cost) as total_cost
   FROM minescope_cur
   WHERE year = '2026' AND month = '04'
   GROUP BY 1, 2, 3
   ORDER BY total_cost DESC;
   ```

   Query 3: Bedrock Cost per Analysis (Cost Attribution)
   ```sql
   SELECT DATE_TRUNC('hour', from_iso8601_timestamp(identity_time_interval)) as hour,
          COUNT(DISTINCT line_item_resource_id) as invocation_count,
          SUM(line_item_usage_amount) as total_tokens,
          SUM(line_item_unblended_cost) as total_cost,
          SUM(line_item_unblended_cost) / COUNT(DISTINCT line_item_resource_id) as cost_per_invocation
   FROM minescope_cur
   WHERE line_item_product_code = 'AmazonBedrock'
     AND year = '2026' AND month = '04'
   GROUP BY 1
   ORDER BY hour;
   ```

   Query 4: Lambda Cost Efficiency (Cost per Invocation)
   ```sql
   SELECT line_item_operation,
          COUNT(*) as invocations,
          SUM(line_item_unblended_cost) as total_cost,
          SUM(line_item_unblended_cost) / COUNT(*) as cost_per_invocation,
          SUM(line_item_usage_amount) / 1024 as total_gb_seconds
   FROM minescope_cur
   WHERE line_item_product_code = 'AWSLambda'
     AND year = '2026' AND month = '04'
   GROUP BY 1
   ORDER BY total_cost DESC;
   ```

### 5. Tagging Strategy

Enforce resource tagging with Config rules:

| Tag Key | Required | Values | Purpose |
|---------|----------|--------|---------|
| Environment | Yes | production, development, sandbox | Cost attribution by env |
| Service | Yes | pipeline, bedrock, quicksight, security | Cost attribution by service |
| Team | Yes | data-engineering, analytics, security, finops | Team cost accountability |
| CostCenter | Yes | cc-1001, cc-1002, cc-1003 | Financial chargeback |
| DataClassification | Yes | confidential, internal, public | Storage tier decisions |
| BackupPolicy | No | daily, weekly, none | Backup cost optimization |
| TTL | No | 7d, 30d, 90d, 365d, never | Lifecycle automation |

Config rule: "required-tags" — all resources must have Environment, Service, Team, CostCenter tags.
Auto-tag new resources via EventBridge + Lambda "auto-tagger".

### 6. Savings Plans & RI Recommendations

Create a Lambda "savings-advisor" (scheduled monthly):

a) Analyze Cost Explorer RI/SP recommendations API
b) Evaluate Savings Plans vs Reserved Instances for:
   - Lambda: 1-year Compute Savings Plan (up to 17% savings)
   - Bedrock: Evaluate if Commitment Discounts available
   - QuickSight: Evaluate annual vs monthly pricing
c) Calculate break-even point and ROI for each recommendation
d) Generate report: s3://minescope-finops/savings-recommendations/{date}.json

### 7. FinOps Dashboard (CloudWatch)

Create a CloudWatch dashboard "MineScope FinOps":

Widgets:
- Total MTD Spend (big number, comparison to budget)
- Spend by Service (stacked area chart, 30-day trend)
- Bedrock Token Usage (line chart: input tokens + output tokens + cost)
- Lambda Invocations vs Cost (dual-axis line chart)
- Budget Status (gauge: $0 → $200)
- Projected Month-End Cost (line chart: actual + forecast)
- Cost per Risk Assessment (calculated metric)
- Top 5 Most Expensive Resources (table)

## Output Requirements

Provide complete AWS CDK (TypeScript) code:
1. All Budget definitions with alerts
2. Cost Anomaly Detection monitors
3. All 4 Lambda functions (cost-saver, bedrock-governor, right-sizing-analyzer, cost-forecast)
4. CUR configuration and S3 bucket setup
5. Athena table DDL and pre-built queries
6. Tagging enforcement Config rules and auto-tagger Lambda
7. CloudWatch FinOps dashboard definition
8. IAM permissions (cost explorer, budgets, cur)
9. SNS topics for FinOps alerts
10. Monthly FinOps review template/report format
```

---

## What This Prompt Generates

| Component | AWS Service | Purpose |
|-----------|------------|---------|
| Budget Alerts | AWS Budgets | Proactive spend monitoring |
| Anomaly Detection | Cost Anomaly Detection | Automatic unusual spend detection |
| Auto Cost Saving | Lambda (cost-saver) | Defensive measures at 90% budget |
| ML Cost Governance | Lambda (bedrock-governor) | Token budgeting for Claude |
| Right-Sizing | Lambda (weekly analyzer) | Resource optimization recommendations |
| Cost Forecasting | Lambda (daily) + Cost Explorer API | Month-end spend prediction |
| Detailed Analysis | CUR + Athena | Per-resource cost attribution |
| Tag Enforcement | Config + Lambda | Automated cost allocation tagging |
| FinOps Dashboard | CloudWatch | Real-time cost visibility |

## Expected Monthly Savings

| Optimization | Estimated Savings |
|-------------|------------------|
| Graviton2 Lambda (already in Prompt 1) | ~$2.40/month (20%) |
| Claude Haiku for low-relevance articles | ~$15-20/month |
| S3 Intelligent-Tiering for old data | ~$0.80/month |
| Kinesis shard right-sizing | ~$5-10/month |
| Lambda memory right-sizing | ~$3-5/month |
| Compute Savings Plans (1-year) | ~$15-20/month |
| **Total Estimated Savings** | **~$41-58/month** |
