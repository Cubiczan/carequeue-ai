# Prompt 2: Geopolitical Risk Analysis with Amazon Bedrock & Claude

## Metadata
- **AWS Services**: Bedrock (Claude 3.5 Sonnet), Lambda, S3, DynamoDB, CloudWatch, Comprehend
- **Complexity**: Advanced
- **Estimated Runtime Cost**: ~$65/month at moderate analysis volume
- **Category**: AI/ML, Natural Language Processing

---

## The Prompt

```
You are an AWS AI/ML Solutions Architect. Build a complete, production-grade geopolitical risk analysis system for critical mineral supply chains using Amazon Bedrock with Anthropic Claude 3.5 Sonnet. The system must analyze news articles, government announcements, trade policy documents, and social media signals to produce actionable risk scores for mining operations and mineral supply chains.

## Context

Critical mineral supply chains (lithium, cobalt, nickel, rare earths, copper) are highly sensitive to geopolitical events. A single export ban, sanctions package, or regulatory change can disrupt global supply. This system must ingest unstructured text from multiple sources, extract relevant entities and sentiments, and generate structured risk assessments that feed into the MineScope Cloud dashboard.

## Requirements

### 1. Data Ingestion Layer

a) **News Article Ingestor Lambda**:
   - Trigger: S3 PutObject notification on bucket "minescope-news-ingest"
   - Supported formats: HTML, plain text, PDF (extracted text), RSS XML
   - Parse and extract: title, body text, source URL, publication date, author, language
   - Detect language using Amazon Comprehend
   - Store parsed article metadata in DynamoDB "minescope-articles" table
   - Route English articles to "analysis-queue" SQS, non-English to "translation-queue" SQS

b) **Translation Lambda** (for non-English articles):
   - Use Amazon Translate to convert to English
   - Store original + translated text in S3: s3://minescope-articles/{article_id}/
   - After translation, send article_id to "analysis-queue"

### 2. Entity Extraction Pipeline

Create a Lambda function "entity-extractor" that:

a) Uses Amazon Comprehend for initial NER (Named Entity Recognition):
   - Detect: PERSON, ORGANIZATION, LOCATION, DATE, EVENT, QUANTITY
   - Custom entity types: MINERAL, MINING_COMPANY, GOVERNMENT_BODY, TRADE_POLICY, REGULATION
   - Train a custom Comprehend entity recognizer using the provided training data format:
     ```json
     {
       "annotations": [
         {"text": "lithium carbonate", "offset": 45, "label": "MINERAL"},
         {"text": "DRC Ministry of Mines", "offset": 120, "label": "GOVERNMENT_BODY"},
         {"text": "export ban", "offset": 200, "label": "TRADE_POLICY"}
       ]
     }
     ```

b) Cross-reference detected entities with MineScope knowledge base:
   - Match LOCATION to countries in DynamoDB "minescope-country-metadata"
   - Match MINERAL to tracked minerals (Li, Co, Ni, REE, Cu)
   - Match ORGANIZATION to known mining companies
   - Calculate relevance_score based on entity overlap with MineScope domain

c) Store extracted entities in DynamoDB "minescope-entities" table:
   - PK: article_id
   - SK: entity_type#entity_name
   - Attributes: confidence, relevance_score, context_snippet

### 3. Sentiment & Impact Analysis with Claude

Create a Lambda function "claude-risk-analyzer" that invokes Amazon Bedrock:

a) **Prompt Engineering for Risk Analysis**:

   System prompt (send to Claude via Bedrock):
   ```
   You are a senior geopolitical analyst specializing in critical mineral supply chains.
   Analyze the following article and produce a structured risk assessment.

   TRacked minerals: Lithium, Cobalt, Nickel, Rare Earth Elements, Copper.
   Tracked countries: China, DRC, Australia, Chile, Indonesia, Russia, Canada, Peru, 
   Bolivia, Philippines, Brazil, Mozambique, Myanmar, USA, Greenland.

   For each relevant mineral-country pair identified in the article, provide:
   1. event_type: one of [trade_policy, sanctions, export_ban, mine_disruption, 
      regulatory_change, diplomatic_event, environmental_disaster, labor_dispute, 
      market_manipulation, technology_breakthrough, infrastructure_development, 
      geopolitical_tension, domestic_policy, court_ruling, merger_acquisition]
   2. severity: integer 1-10 (10 = most severe supply impact)
   3. time_horizon: immediate (< 1 month), short_term (1-6 months), medium_term (6-24 months), long_term (> 2 years)
   4. supply_impact_pct: estimated percentage impact on global supply (0-100)
   5. price_impact_pct: estimated percentage impact on commodity price (0-100)
   6. confidence: your confidence in this assessment (low, medium, high)
   7. reasoning: 2-3 sentence explanation
   8. recommended_actions: array of 2-4 actionable recommendations for supply chain managers
   9. related_entities: array of related countries, companies, or minerals that may be affected
   10. source_reliability: assessment of the news source reliability (high, medium, low, unverified)

   Respond ONLY in valid JSON format. If the article is not relevant to critical minerals, 
   return {"relevance": "none"}.
   ```

   User prompt template:
   ```
   Article Title: {title}
   Source: {source}
   Publication Date: {date}
   
   Article Text:
   {body_text}
   
   Extracted Entities:
   - Countries: {locations}
   - Minerals: {minerals}
   - Organizations: {organizations}
   - Events: {events}
   ```

b) **Bedrock Invocation Configuration**:
   - Model: anthropic.claude-3-5-sonnet-20241022-v2:0
   - Inference parameters:
     - temperature: 0.1 (deterministic analysis)
     - max_tokens: 4096
     - top_p: 0.9
     - top_k: 50
   - Use InvokeModel API (not streaming) for batch processing
   - Implement retry with exponential backoff (3 retries, 1s/2s/4s delays)
   - Handle throttling with TokenBucket rate limiter

c) **Response Processing**:
   - Parse Claude's JSON response
   - Validate against JSON schema (reject malformed responses, retry once)
   - For each risk assessment in the response:
     - Store in DynamoDB "minescope-risk-assessments" table:
       - PK: country#mineral (e.g., "DRC#cobalt")
       - SK: assessment_timestamp (epoch milliseconds)
       - Attributes: article_id, event_type, severity, time_horizon, supply_impact_pct, 
         price_impact_pct, confidence, reasoning, recommended_actions, related_entities,
         source_reliability, claude_model_version
     - Update composite risk score in DynamoDB "minescope-risk-scores":
       - Recalculate weighted average: 0.4 * latest_assessment + 0.3 * 7_day_avg + 0.2 * 30_day_avg + 0.1 * historical_baseline
       - Only update if new assessment confidence >= medium

### 4. Alert Generation

Create Lambda "alert-generator":

a) Query "minescope-risk-assessments" for assessments in the last hour
b) If severity >= 7 AND confidence in [medium, high]:
   - Generate alert event and publish to EventBridge bus "minescope-data-bus"
   - Create SNS notification to "minescope-alerts" topic
   - Alert payload includes: mineral, country, severity, event_type, supply_impact, 
     price_impact, recommended_actions
c) If severity >= 9 AND confidence = high:
   - Additionally invoke Lambda "emergency-notification":
     - Send paginated alert (pager duty style) via SNS
     - Log to CloudWatch as CRITICAL event
     - Trigger Step Functions state machine "incident-response" (if exists)

### 5. Daily Intelligence Briefing

Create a Lambda "daily-briefing-generator" (triggered by EventBridge scheduled rule, daily at 8 AM UTC):

a) Query all risk assessments from the past 24 hours
b) Invoke Claude via Bedrock with this prompt:
   ```
   You are a senior intelligence analyst. Based on the following risk assessments from 
   the past 24 hours, produce a daily intelligence briefing for critical mineral 
   supply chain managers.

   The briefing must include:
   1. EXECUTIVE SUMMARY (3-5 sentences on the most significant developments)
   2. CRITICAL WATCH LIST (table format: Mineral | Country | Risk Level | Key Development | Recommended Action)
   3. TRENDING RISKS (risks that have escalated in the past 7 days)
   4. RISK REDUCTIONS (positive developments that decreased risk)
   5. MARKET OUTLOOK (bullet points on expected price/supply movements)
   6. ACTION ITEMS (prioritized list of 3-5 recommended actions for this week)

   Format the briefing in clean Markdown.

   Risk Assessments:
   {assessments_json}
   ```

c) Store briefing in S3: s3://minescope-briefings/{YYYY-MM-DD}.md
d) Distribute via SNS email subscription
e) Optionally convert to PDF using Amazon Chime SDK or external service

### 6. Knowledge Base Management

a) Create S3-based knowledge base for Claude context:
   - Upload reference documents: USGS Mineral Commodity Summaries, IEA Critical Minerals Reports,
     World Bank mining regulations database
   - Store in s3://minescope-knowledge-base/
   - Include context in Claude prompts by fetching relevant excerpts based on entity matches

b) Maintain a feedback loop:
   - Store Claude's confidence scores and track accuracy over time
   - If an assessment's predicted price_impact doesn't match actual price movement (±5%),
     log the discrepancy for model prompt refinement

### 7. Guardrails & Safety

a) Implement Amazon Bedrock Guardrails:
   - Content filter: block irrelevant or harmful content
   - Topic filter: restrict to geopolitical/economic analysis
   - Word filter: block profanity or off-topic language
   - PII detection: detect and redact personal information before storage

b) Human-in-the-loop for high-impact assessments:
   - If severity >= 8, mark assessment as "pending_review" in DynamoDB
   - Store in S3 for manual review: s3://minescope-pending-reviews/{assessment_id}.json
   - Only apply to risk score calculation after manual approval (via API endpoint)

### 8. Cost Monitoring

a) Track Bedrock usage with CloudWatch:
   - Input tokens consumed per analysis
   - Output tokens consumed per analysis
   - Number of invocations per day
   - Cost per analysis (input_tokens × $0.003/1K + output_tokens × $0.015/1K)

b) Set Budget alert at $50/month for Bedrock usage
c) Implement token optimization:
   - Truncate article text to 4000 characters before sending to Claude
   - Use entity pre-filtering to skip clearly irrelevant articles
   - Batch related articles for combined analysis

## Output Requirements

Provide complete, deployable AWS CDK (TypeScript) code:
1. Bedrock configuration and Guardrails setup
2. All Lambda functions with full TypeScript code
3. DynamoDB tables with appropriate GSIs
4. S3 bucket configurations with lifecycle policies
5. SQS queues and EventBridge rules
6. CloudWatch dashboards for Claude usage monitoring
7. IAM roles (least-privilege, including bedrock:InvokeModel)
8. Deployment instructions and testing guide
9. Cost estimation spreadsheet

Include sample Claude responses for 3 test articles about:
- China announcing rare earth export restrictions
- DRC mine strike affecting cobalt production
- Australia approving new lithium mining regulations
```

---

## What This Prompt Generates

| Component | AWS Service | Purpose |
|-----------|------------|---------|
| News Ingestor | Lambda + S3 | Parse articles from multiple formats |
| Translation | Lambda + Amazon Translate | Handle non-English sources |
| Entity Extractor | Lambda + Comprehend (Custom NER) | Extract minerals, countries, policies |
| Risk Analyzer | Lambda + Bedrock (Claude 3.5 Sonnet) | AI-powered geopolitical risk scoring |
| Alert Generator | Lambda + EventBridge + SNS | Critical risk notifications |
| Daily Briefing | Lambda + Bedrock + S3 | Automated intelligence reports |
| Knowledge Base | S3 + Comprehend | Reference documents for context |
| Guardrails | Bedrock Guardrails | Content safety and topic filtering |
| Monitoring | CloudWatch Metrics + Dashboard | Claude usage and cost tracking |

## Expected Monthly Cost (100 articles/day)

| Service | Configuration | Monthly Cost |
|---------|--------------|-------------|
| Bedrock (Claude 3.5 Sonnet) | 3,000 analyses × ~3K tokens avg | ~$45 |
| Lambda | 6 functions × ~50K invocations | ~$8 |
| Comprehend | NER + Custom entities | ~$5 |
| Translate | ~20 non-English articles/day | ~$2 |
| DynamoDB | 4 tables, on-demand | ~$4 |
| S3 | Articles + briefings (~20 GB) | ~$0.50 |
| CloudWatch | Metrics + dashboards | ~$0.50 |
| **Total** | | **~$65/month** |
