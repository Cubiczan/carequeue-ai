# Hackathon Submission — MineScope Cloud

---

## Project Information

| Field | Value |
|---|---|
| **Project Name** | MineScope Cloud |
| **Tagline** | 7 Expert AWS Prompts for Critical Mineral Supply Chain Intelligence |
| **Challenge** | AWS Prompt the Planet (DoraHacks) |
| **Category** | AI/ML, Data Analytics, Cloud Infrastructure |
| **License** | MIT |

---

## Short Description (Under 300 Characters)

> MineScope Cloud: 7 expert AWS prompts that deploy a complete critical mineral intelligence platform — real-time data pipeline, Claude AI risk analysis, QuickSight dashboards, security, FinOps, and multi-region DR.

**Character count:** 231 / 300

---

## Long Description

### The Problem

Critical mineral supply chains — lithium, cobalt, nickel, rare earths, copper — are the backbone of the energy transition. EVs, solar panels, wind turbines, and grid batteries all depend on these five minerals. But their supply chains are dangerously concentrated: 70% of rare earths come from China, 70% of cobalt from the DRC. A single export ban, port closure, or sanctions package can send shockwaves through the global economy.

Currently, mining companies, investors, and policymakers rely on fragmented, stale data spread across dozens of platforms. There's no unified system that combines real-time commodity pricing with geopolitical risk analysis, supply chain mapping, and ESG compliance tracking. The result is billions in losses from blind decisions made on outdated information.

### Our Solution: MineScope Cloud

MineScope Cloud is a collection of **7 expert-grade AWS prompts** that, when executed by an AI assistant, generate a complete, production-grade critical mineral intelligence platform. Each prompt is self-contained and produces deployable infrastructure-as-code (AWS CDK in TypeScript), covering every layer of a modern cloud application:

1. **Real-Time Data Pipeline** (Lambda + EventBridge + Kinesis + S3) — Ingests price ticks, geopolitical events, and supply chain status updates, aggregates them into OHLCV candles, and detects price spikes automatically.

2. **AI Geopolitical Risk Analysis** (Bedrock + Claude 3.5 Sonnet + Comprehend) — Analyzes news articles from global sources, extracts entities (minerals, countries, policies), and generates structured risk scores with confidence ratings, recommended actions, and supply impact estimates.

3. **Interactive Intelligence Dashboard** (QuickSight + Athena + Glue) — A 5-tab executive dashboard with price analytics, geopolitical risk intelligence, supply chain operations, and company benchmarking — all backed by a serverless data lake.

4. **Security & Compliance Posture** (Security Hub + IAM + Config + KMS + WAF + Shield) — Multi-account security with least-privilege IAM, encryption at rest and in transit, audit trails, DDoS protection, and automated incident response.

5. **FinOps Cost Optimization** (Cost Explorer + Budgets + Anomaly Detection) — Proactive budget alerts, auto cost-saving measures at 90% budget, Claude token budgeting, right-sizing recommendations, and daily cost forecasting.

6. **Multi-Region Disaster Recovery** (DynamoDB Global Tables + S3 CRR + Route 53 + CloudFront) — Active-active replication across 3 AWS regions (us-east-1, eu-west-1, ap-southeast-1) with RPO < 1 minute and RTO < 15 minutes.

7. **Full IaC Deployment** (CDK + CodePipeline + CodeBuild + X-Ray) — Complete CI/CD pipeline deploying all 6 systems with environment management, security gates (cdk-nag), and automated DR testing.

### Best Feature

The **Claude-powered geopolitical risk analysis pipeline** is the standout feature. Here's why:

When a news article about, say, China announcing new rare earth export restrictions hits the wire, the system automatically: (1) parses the article, (2) detects the language and translates if needed, (3) extracts entities using Amazon Comprehend's custom NER (identifying "rare earths" as a mineral, "China" as a country, "export restriction" as a trade policy), (4) sends the enriched article to Claude 3.5 Sonnet via Amazon Bedrock with an expert-crafted system prompt that asks for structured risk assessment, and (5) Claude returns a JSON response with severity score, supply impact percentage, price impact prediction, confidence rating, reasoning, and actionable recommendations for supply chain managers. This assessment is stored in DynamoDB, updates the composite risk score, and triggers an alert if severity exceeds the threshold.

The prompt that generates this entire system includes prompt engineering for Claude's risk analysis system prompt, retry logic with exponential backoff, Bedrock Guardrails for content safety, human-in-the-loop review for high-impact assessments, and a daily AI-generated intelligence briefing. It demonstrates what's possible when you combine expert prompt engineering with the full power of AWS AI services.

### Why It Matters

- The critical minerals market is projected to reach **$41.5B by 2030**
- Supply chain disruptions caused **$2.3 trillion** in economic losses in 2022-2024
- ESG compliance is now a **legal requirement** (EU CSRD, US SEC Climate Disclosure)
- This prompt collection makes enterprise-grade intelligence infrastructure **accessible to any developer** — just copy, paste, and deploy

---

## Demo Video

> 🔗 [Demo Video — GitHub Releases](https://github.com/icohangar-ops/Minescope/releases/tag/v1.0.0)

---

## Project Links

| Link | URL |
|---|---|
| **Source Code** | [github.com/icohangar-ops/Minescope](https://github.com/icohangar-ops/Minescope) |
| **Demo Video** | [GitHub Releases v1.0.0](https://github.com/icohangar-ops/Minescope/releases/tag/v1.0.0) |

---

## AWS Services Used (20+)

| Category | Services |
|----------|----------|
| **Compute** | Lambda (arm64), CodeBuild |
| **Storage** | S3, S3 CRR, DynamoDB Global Tables |
| **AI/ML** | Bedrock (Claude 3.5 Sonnet), Comprehend, Translate |
| **Analytics** | QuickSight, Athena, Glue |
| **Streaming** | EventBridge, Kinesis Data Streams, SQS, SNS |
| **Security** | Security Hub, IAM, Config, KMS, WAF, Shield, GuardDuty, CloudTrail |
| **Networking** | Route 53, CloudFront, VPC |
| **Management** | Cost Explorer, Budgets, Anomaly Detection, Systems Manager, Organizations, Control Tower |
| **IaC/DevOps** | CDK (TypeScript), CodePipeline, X-Ray, FIS, Step Functions |

---

## Social Media Posts

### Twitter/X Post

> ⛏️ MineScope Cloud — 7 expert AWS prompts that deploy a complete critical mineral intelligence platform.
>
> Real-time data pipeline, Claude AI risk analysis, QuickSight dashboards, multi-region DR — all from prompts.
>
> #AWSPromptThePlanet #BuildOnAWS #CriticalMinerals

### LinkedIn Post

> 🚀 Excited to share MineScope Cloud — my submission for the AWS Prompt the Planet Challenge.

> It's a collection of 7 expert-grade AWS prompts that, when executed by an AI assistant, generate a complete critical mineral supply chain intelligence platform.

> The prompts cover:
> ✅ Real-time data pipeline (Lambda + Kinesis + EventBridge)
> ✅ AI risk analysis with Claude 3.5 (Bedrock + Comprehend)
> ✅ Interactive dashboards (QuickSight + Athena)
> ✅ Security & compliance (Security Hub + IAM + KMS + WAF)
> ✅ FinOps optimization (Cost Explorer + Budgets + Anomaly Detection)
> ✅ Multi-region disaster recovery (DynamoDB Global Tables + S3 CRR)
> ✅ Full IaC deployment (CDK + CodePipeline)

> 20+ AWS services, production-grade code, ~$425/month at moderate scale.

> #AWS #PromptEngineering #CriticalMinerals #SupplyChain

---

## Team

Built as an open-source project.
