# MineScope Cloud — AWS Prompt Collection

> **AWS Prompt the Planet Challenge** — Expert-level prompts for deploying critical mineral supply chain intelligence on AWS.

## Overview

This collection contains **7 expert-grade prompts** designed to deploy a full-stack, production-grade critical mineral intelligence platform on AWS. Each prompt is self-contained, battle-tested against AWS best practices, and covers a specific domain of the MineScope Cloud architecture.

## Prompt Index

| # | Prompt | AWS Services | Complexity |
|---|--------|-------------|------------|
| 1 | [Real-Time Data Pipeline](./01-lambda-eventbridge-pipeline.md) | Lambda, EventBridge, SQS, Kinesis, S3 | Advanced |
| 2 | [Geopolitical Risk Analysis with AI](./02-bedrock-risk-analysis.md) | Bedrock (Claude), Lambda, S3, CloudWatch | Advanced |
| 3 | [Interactive Intelligence Dashboard](./03-quicksight-dashboard.md) | QuickSight, Athena, Glue, S3 | Intermediate |
| 4 | [Security & Compliance Posture](./04-security-hub-iam.md) | Security Hub, IAM, Config, CloudTrail, KMS | Advanced |
| 5 | [FinOps Cost Optimization](./05-cost-explorer-budgets.md) | Cost Explorer, Budgets, CE API, CloudWatch | Intermediate |
| 6 | [Multi-Region Disaster Recovery](./06-dynamodb-s3-dr.md) | DynamoDB (Global Tables), S3 (Cross-Region), Route 53, CloudFront | Expert |
| 7 | [Full IaC Deployment](./07-cdk-terraform-deployment.md) | CDK (TypeScript), Terraform, CloudFormation | Expert |

## How to Use These Prompts

1. **Copy** the full prompt text from any `.md` file
2. **Paste** it into Amazon Q Developer, Claude via Amazon Bedrock, or any AWS-aware AI assistant
3. **Customize** the placeholder values (region, mineral names, data sources) to match your needs
4. **Execute** the generated code using AWS CDK, SAM, or the AWS CLI

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MineScope Cloud on AWS                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Data Ingest │  │  AI/ML Layer │  │  Visualization   │  │
│  │  Lambda +    │→ │  Bedrock +   │→ │  QuickSight +    │  │
│  │  EventBridge │  │  Claude      │  │  CloudFront      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                  │                    │             │
│  ┌──────▼──────────────────▼────────────────────▼──────────┐│
│  │                    AWS Data Plane                        ││
│  │  DynamoDB Global Tables · S3 Cross-Region · Athena       ││
│  └─────────────────────────────────────────────────────────┘│
│         │                  │                    │             │
│  ┌──────▼──────────────────▼────────────────────▼──────────┐│
│  │                  Security & Governance                   ││
│  │  Security Hub · IAM · KMS · CloudTrail · Config          ││
│  └─────────────────────────────────────────────────────────┘│
│         │                  │                    │             │
│  ┌──────▼──────────────────▼────────────────────▼──────────┐│
│  │                 FinOps & IaC                             ││
│  │  Cost Explorer · Budgets · CDK · Terraform               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Challenge Alignment

These prompts directly address the **AWS Prompt the Planet** evaluation criteria:

- **Real-World Applicability**: Each prompt solves a concrete problem in critical mineral intelligence
- **AWS Service Depth**: Prompts leverage 20+ AWS services across compute, storage, AI/ML, security, and analytics
- **Production-Grade Quality**: Includes error handling, monitoring, cost controls, and security hardening
- **Reproducibility**: Every prompt generates deployable IaC code (CDK/Terraform)
