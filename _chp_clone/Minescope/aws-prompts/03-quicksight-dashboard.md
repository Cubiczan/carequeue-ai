# Prompt 3: Interactive Intelligence Dashboard with Amazon QuickSight

## Metadata
- **AWS Services**: QuickSight, Athena, Glue Crawler, S3, Lambda, CloudFormation
- **Complexity**: Intermediate
- **Estimated Runtime Cost**: ~$35/month (Standard Edition) or ~$200/month (Enterprise)
- **Category**: Data Visualization & Business Intelligence

---

## The Prompt

```
You are an AWS Analytics Solutions Architect. Build a complete Amazon QuickSight dashboard for the MineScope critical mineral intelligence platform. The dashboard must visualize real-time commodity prices, supply chain risk heatmaps, country-level production analysis, ESG compliance metrics, and company benchmarking data — all sourced from the data lake created by the MineScope pipeline (Prompts 1 & 2).

## Prerequisites (Data Lake Schema)

The following data exists in S3 bucket "minescope-raw-data":

a) s3://minescope-raw-data/price-candles/{mineral_id}/{year}/{month}/{day}/*.json
   Schema: { mineral_id, timestamp, open, high, low, close, volume, ma_5m, ma_15m, ma_1h, source }

b) s3://minescope-raw-data/geo-events/{year}/{month}/{day}/*.json
   Schema: { event_id, timestamp, event_type, severity, country, minerals_affected[], supply_impact_pct, description, source, source_reliability }

c) s3://minescope-raw-data/supply-status/{year}/{month}/{day}/*.json
   Schema: { facility_id, timestamp, facility_name, country, mineral, status, utilization, capacity, status_change_from }

d) s3://minescope-raw-data/risk-assessments/{year}/{month}/{day}/*.json
   Schema: { assessment_id, timestamp, country, mineral, event_type, severity, confidence, supply_impact_pct, price_impact_pct, reasoning, recommended_actions[], claude_model_version }

## Requirements

### 1. AWS Glue Data Catalog Setup

Create a Glue Crawler configuration that:

a) Crawls "minescope-raw-data" bucket with these specifications:
   - Data store: S3, path: s3://minescope-raw-data/
   - Crawler name: "minescope-data-lake-crawler"
   - Classifier: JSON classifier for all subdirectories
   - Database: "minescope_analytics"
   - Schedule: Run daily at 2 AM UTC
   - Grouping: enabled (combine schemas per prefix)
   - Recrawl behavior: Update table definitions

b) Creates 4 tables in Glue database "minescope_analytics":
   - price_candles (partitioned by year, month, day)
   - geo_events (partitioned by year, month, day)
   - supply_status (partitioned by year, month, day)
   - risk_assessments (partitioned by year, month, day)

### 2. Athena Views for Analysis

Create Athena views in the "minescope_analytics" database:

a) **v_daily_price_summary**:
   ```sql
   SELECT mineral_id,
          date_trunc('day', from_unixtime(timestamp/1000)) as trade_date,
          AVG(close) as avg_close_price,
          MAX(high) as daily_high,
          MIN(low) as daily_low,
          SUM(volume) as total_volume,
          (AVG(close) - LAG(AVG(close)) OVER (PARTITION BY mineral_id ORDER BY trade_date)) / 
            LAG(AVG(close)) OVER (PARTITION BY mineral_id ORDER BY trade_date) * 100 as pct_change
   FROM price_candles
   GROUP BY mineral_id, date_trunc('day', from_unixtime(timestamp/1000))
   ```

b) **v_risk_score_composite**:
   ```sql
   SELECT country,
          mineral,
          AVG(severity) as avg_severity,
          AVG(supply_impact_pct) as avg_supply_impact,
          AVG(price_impact_pct) as avg_price_impact,
          COUNT(*) as event_count,
          MAX(severity) as max_severity,
          COUNTIF(confidence = 'high') as high_confidence_count
   FROM risk_assessments
   WHERE timestamp >= (CAST(NOW() AS BIGINT) * 1000) - (30 * 24 * 60 * 60 * 1000)
   GROUP BY country, mineral
   ```

c) **v_country_production_heatmap**:
   ```sql
   SELECT country,
          mineral,
          COUNT(DISTINCT facility_id) as facility_count,
          AVG(utilization) as avg_utilization,
          COUNTIF(status = 'operational') as operational_count,
          COUNTIF(status = 'shutdown') as shutdown_count,
          COUNTIF(status = 'reduced') as reduced_count,
          SUM(capacity) as total_capacity
   FROM supply_status
   WHERE timestamp >= (CAST(NOW() AS BIGINT) * 1000) - (7 * 24 * 60 * 60 * 1000)
   GROUP BY country, mineral
   ```

d) **v_supply_chain_velocity**:
   ```sql
   SELECT date_trunc('hour', from_unixtime(timestamp/1000)) as hour_bucket,
          mineral_id,
          COUNT(*) as events_per_hour,
          AVG(volume) as avg_volume,
          STDDEV(close) as price_volatility
   FROM price_candles
   WHERE timestamp >= (CAST(NOW() AS BIGINT) * 1000) - (24 * 60 * 60 * 1000)
   GROUP BY 1, 2
   ```

e) **v_top_risks_7day**:
   ```sql
   SELECT country,
          mineral,
          event_type,
          severity,
          supply_impact_pct,
          price_impact_pct,
          confidence,
          reasoning,
          from_unixtime(timestamp/1000) as event_date
   FROM risk_assessments
   WHERE severity >= 7
     AND timestamp >= (CAST(NOW() AS BIGINT) * 1000) - (7 * 24 * 60 * 60 * 1000)
   ORDER BY severity DESC, supply_impact_pct DESC
   LIMIT 50
   ```

### 3. QuickSight Dashboard "MineScope Intelligence Center"

Build a multi-tab QuickSight dashboard with the following sheets:

#### Tab 1: "Market Overview" (Executive Summary)
- **KPI Cards** (top row):
  - Total tracked minerals (5, static)
  - Active alerts (count from risk_assessments where severity >= 7, last 24h)
  - Average risk score (avg severity across all assessments, last 7 days)
  - Countries with elevated risk (count where avg_severity > 6)
  - Most volatile mineral (highest price_volatility from v_supply_chain_velocity)

- **Price Trend Line Chart**:
  - Multi-line chart showing close price trends for all 5 minerals over 30 days
  - X-axis: trade_date, Y-axis: avg_close_price
  - Color-coded by mineral (consistent palette: Li=teal, Co=purple, Ni=gold, REE=red, Cu=orange)
  - Tooltip: mineral_id, date, price, pct_change, volume

- **Risk Heatmap**:
  - Pivot table with countries as rows, minerals as columns, avg_severity as cell values
  - Conditional formatting: green (0-3), yellow (4-6), orange (7-8), red (9-10)
  - Click-through to detailed risk view

#### Tab 2: "Price Analytics"
- **Interactive Price Chart**:
  - Line chart with mineral selector (parameter control: mineral_id dropdown)
  - Time range selector: 1W, 1M, 3M, 6M, 1Y, ALL (parameter control)
  - Show OHLCV candlestick approximation using reference lines for high/low
  - Overlaid moving averages (5m, 15m, 1h) with toggle visibility

- **Volume Analysis**:
  - Bar chart showing total_volume by trade_date
  - Stacked by mineral_id
  - Highlight bars where volume exceeds 2 standard deviations from 30-day average

- **Price Correlation Matrix**:
  - Custom visual or table showing correlation coefficients between mineral pairs
  - Calculated from daily pct_change values over rolling 30-day window

- **Volatility Ranking**:
  - Horizontal bar chart ranking minerals by 30-day price_volatility (STDDEV from v_supply_chain_velocity)
  - Sparkline inset for each bar showing 7-day volatility trend

#### Tab 3: "Geopolitical Risk Intelligence"
- **Risk Timeline**:
  - Event stream visualization showing geo-events over time
  - Point size = severity, color = event_type
  - Filter controls: country dropdown, mineral dropdown, severity range slider

- **Country Risk Profile** (parameter-driven):
  - Select country → show radar-like chart with 6 risk dimensions
  - Use horizontal bar chart (QuickSight doesn't have native radar): 6 bars for geopolitical, 
     environmental, regulatory, infrastructure, labor, concentration risks
  - Side panel: recent events table for selected country

- **Impact Analysis Scatter Plot**:
  - X-axis: supply_impact_pct, Y-axis: price_impact_pct
  - Point color: severity, size: confidence
  - Quadrant labels: "High Supply Impact / Low Price" → "Monitor", 
    "High Supply / High Price" → "Critical", etc.
  - Trendline: linear regression of supply vs price impact

- **Event Type Distribution**:
  - Donut chart showing count by event_type
  - Top 5 most common event types with drill-down to event list

#### Tab 4: "Supply Chain Operations"
- **Facility Status Map** (map visual):
  - QuickSight map visual with custom points for each facility
  - Point color: status (green=operational, yellow=reduced, red=shutdown, gray=maintenance)
  - Point size: capacity
  - Tooltip: facility_name, country, mineral, status, utilization%, capacity

- **Production Utilization**:
  - 100% stacked bar chart: operational vs reduced vs shutdown vs maintenance
  - Grouped by country (top 10 producers)
  - Reference line at 80% utilization target

- **Supply Disruption Tracker**:
  - Table showing facilities where status changed from operational to reduced/shutdown in last 30 days
  - Columns: facility_name, country, mineral, previous_status, current_status, change_date, 
     estimated_impact (capacity_lost × country_production_share)

#### Tab 5: "Company Benchmarking" (Static reference data)
- Create a Lambda function that generates company benchmarking CSV data from 
  DynamoDB "minescope-company-benchmark" table and uploads to S3 weekly
- **Company Comparison Table**:
  - Sortable table with: company_name, primary_mineral, production_volume, 
     proven_reserves, esg_score, market_cap, revenue, cost_per_ton
  - Conditional formatting on ESG scores (red < 40, yellow 40-70, green > 70)
  
- **ESG Leaderboard**:
  - Horizontal bar chart ranking companies by ESG score
  - Color segments: Environmental (green), Social (blue), Governance (purple)
  
- **Production vs Market Cap Bubble Chart**:
  - X-axis: production_volume, Y-axis: market_cap
  - Bubble size: proven_reserves
  - Color: esg_score gradient

### 4. QuickSight Parameters & Interactivity

Define the following parameters:
- `pMineral` (dropdown): Lithium, Cobalt, Nickel, Rare Earths, Copper, All
- `pCountry` (dropdown): dynamic list from geo_events distinct countries
- `pDateRange` (dropdown): Last 7 Days, Last 30 Days, Last 90 Days, Last Year, All Time
- `pSeverityMin` (slider): 1-10
- `pEventType` (multi-select dropdown): all event_type values

Apply parameters as filters to all visuals with "apply to entire sheet" scope.
Enable cross-sheet filtering: selecting a country on Tab 3 filters Tabs 4 and 5.

### 5. SPICE Import & Refresh

Configure SPICE datasets:
- Import all 5 Athena views + 2 tables (price_candles, geo_events) into SPICE
- Schedule incremental refresh:
  - price_candles: every 15 minutes
  - geo_events: every 30 minutes
  - risk_assessments: every 1 hour
  - supply_status: every 1 hour
  - All views: every 1 hour (dependent on base table refresh)
- Set SPICE capacity alert at 80% utilization

### 6. Embedded Dashboard

Configure QuickSight embedding for the MineScope web application:
- Use anonymous embedding (GenerateEmbedUrlForAnonymousUser) for public dashboard
- Or use registered user embedding for authenticated access
- Set allowed domains: *.minescope.cloud (or your domain)
- Configure dashboard permissions: read-only for embedded users
- Pass dashboard parameters via URL: ?pCountry=China&pMineral=Lithium

### 7. Access Control

- Create QuickSight groups: "executives", "analysts", "external_viewers"
- Executives: full dashboard access + export to CSV/PDF
- Analysts: full dashboard access + ability to create analyses
- External viewers: embedded dashboard only, no export
- Row-level security: analysts see all countries; external viewers exclude 
  "restricted" countries (configurable)

## Output Requirements

Provide:
1. Complete AWS CDK (TypeScript) code for all infrastructure
2. Athena DDL for all tables and views (with appropriate SerDe configurations for JSON)
3. QuickSight dashboard definition JSON (or a Python script using boto3 to create the dashboard)
4. SPICE refresh configuration
5. Parameter definitions and filter configurations
6. Lambda function for company data export
7. IAM policies for QuickSight (least-privilege)
8. Testing guide with sample queries
9. Cost estimation by QuickSight edition (Standard vs Enterprise)
```

---

## What This Prompt Generates

| Component | AWS Service | Purpose |
|-----------|------------|---------|
| Data Catalog | Glue Crawler | Auto-discover S3 data lake schema |
| SQL Analytics | Athena Views | Pre-computed aggregations and joins |
| Dashboard | QuickSight (6-sheet) | Executive-grade interactive analytics |
| Parameters | QuickSight Parameters | Cross-filtering across all sheets |
| Data Refresh | SPICE Incremental | Near real-time dashboard updates |
| Embedding | QuickSight Embedding SDK | Integrate into MineScope web app |
| Access Control | QuickSight Groups + RLS | Role-based and row-level security |

## Expected Monthly Cost

| Edition | SPICE Capacity | Authors | Monthly Cost |
|---------|---------------|---------|-------------|
| Standard | 10 GB (included) | 1 (included) | ~$24 (reader sessions) |
| Enterprise | 500 GB (included) | Up to 5 (included) | ~$250 (per user pricing) |
| *Note* | Pay-per-session pricing available | | *~$0.50/hour active* |
