# Prompt 4: Security & Compliance Posture with AWS Security Hub & IAM

## Metadata
- **AWS Services**: Security Hub, IAM, Config, CloudTrail, KMS, WAF, Shield, GuardDuty, Organizations
- **Complexity**: Advanced
- **Estimated Runtime Cost**: ~$25/month (at moderate scale)
- **Category**: Security, Governance, Compliance

---

## The Prompt

```
You are an AWS Security Architect specializing in data governance and compliance for financial/commodity intelligence platforms. Build a comprehensive security posture for the MineScope Cloud platform that handles sensitive commodity data, geopolitical intelligence, and ESG compliance information. The platform processes data from government sources, news agencies, and proprietary mining data — making security and compliance critical requirements.

## Compliance Requirements

MineScope Cloud must comply with:
- **SOC 2 Type II**: Data security, availability, processing integrity
- **ISO 27001**: Information security management
- **GDPR**: For any EU citizen data in ESG/social metrics
- **EU CSRD**: Environmental reporting data integrity
- **US SEC Climate Disclosure**: Financial reporting accuracy for publicly traded mining companies

## Requirements

### 1. AWS Organizations & Account Structure

Create a multi-account structure using AWS Organizations:

```
Organization Root (minescope-org)
├── Management Account (paying account, no workloads)
├── Log Archive Account (centralized logging)
├── Security Tooling Account (Security Hub aggregator, GuardDuty admin)
├── Production Account (MineScope prod workloads)
│   ├── VPC: minescope-prod-vpc (10.0.0.0/16)
│   │   ├── Public Subnets: 10.0.1.0/24, 10.0.2.0/24 (us-east-1a, us-east-1b)
│   │   ├── Private Subnets: 10.0.10.0/24, 10.0.11.0/24 (us-east-1a, us-east-1b)
│   │   └── Isolated Subnets: 10.0.20.0/24, 10.0.21.0/24 (DynamoDB, no internet)
├── Development Account (staging, testing)
└── Sandbox Account (developer experiments, strict budget $50/month)
```

Enable AWS Control Tower for:
- Account factory with guardrails
- Automated OU-based permission boundaries
- CloudTrail and Config enabled by default in all accounts
- VPC with flow logs in all accounts

### 2. IAM — Least-Privilege Access

Create IAM policies and roles using CDK (TypeScript) with the following granularity:

a) **Pipeline Role** (minescope-pipeline-role):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:PutItem",
           "dynamodb:UpdateItem",
           "dynamodb:GetItem",
           "dynamodb:Query"
         ],
         "Resource": [
           "arn:aws:dynamodb:*:*:table/minescope-*",
           "arn:aws:dynamodb:*:*:table/minescope-*/index/*"
         ],
         "Condition": {
           "StringEquals": { "aws:RequestedRegion": "us-east-1" }
         }
       },
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject"
         ],
         "Resource": "arn:aws:s3:::minescope-raw-data/*"
       },
       {
         "Effect": "Allow",
         "Action": [
           "events:PutEvents"
         ],
         "Resource": "arn:aws:events:*:*:event-bus/minescope-data-bus"
       },
       {
         "Effect": "Allow",
         "Action": [
           "cloudwatch:PutMetricData"
         ],
         "Resource": "*",
         "Condition": {
           "StringEquals": { "cloudwatch:namespace": "MineScope/Pipeline" }
         }
       }
     ]
   }
   ```

b) **Bedrock Analysis Role** (minescope-bedrock-role):
   - Allow: bedrock:InvokeModel only for anthropic.claude-3-5-sonnet-20241022-v2:0
   - Allow: comprehend:DetectEntities, comprehend:BatchDetectEntities
   - Allow: translate:TranslateText
   - Deny: bedrock:InvokeModel for all other model IDs
   - Allow: s3:GetObject on minescope-articles/*
   - Allow: dynamodb:PutItem, Query on minescope-risk-assessments, minescope-entities
   - Add condition: aws:SourceIp restricted to VPC CIDR range (prevent external invocation)

c) **QuickSight Reader Role** (minescope-quicksight-reader):
   - Allow: athena:StartQueryExecution, athena:GetQueryResults
   - Allow: glue:GetDatabase, glue:GetTable, glue:GetTables
   - Allow: s3:GetObject on minescope-raw-data/* (read-only)
   - Deny: s3:PutObject, s3:DeleteObject

d) **Human Reviewer Role** (minescope-reviewer):
   - Allow: dynamodb:UpdateItem on minescope-risk-assessments
   - Allow: s3:GetObject, PutObject on minescope-pending-reviews/*
   - Allow: lambda:InvokeFunction on emergency-notification function
   - Require MFA: "aws:MultiFactorAuthAge": "3600"

e) **Admin Role** (minescope-admin — break-glass only):
   - Full access but requires MFA
   - CloudTrail logged with "admin_actions" trail
   - Auto-rotated credentials via IAM Access Analyzer

### 3. AWS Config Rules

Deploy the following AWS Config rules (managed + custom):

| Rule Name | Type | Scope | Remediation |
|-----------|------|-------|-------------|
| s3-bucket-encryption | Managed | All S3 buckets | Auto-enable SSE-S3 |
| s3-bucket-versioning | Managed | All S3 buckets | Auto-enable versioning |
| s3-bucket-public-read-prohibited | Managed | All S3 buckets | Auto-remediate ACLs |
| dynamodb-encryption | Managed | All DynamoDB tables | Auto-enable CMK encryption |
| dynamodb-point-in-time-recovery | Managed | All DynamoDB tables | Enable PITR |
| lambda-concurrency-check | Custom | All Lambda functions | Alert if unreserved |
| lambda-inside-vpc | Custom | Pipeline Lambdas | Alert if not in VPC |
| vpc-flow-logs-enabled | Managed | All VPCs | Auto-create flow log |
| cloud-trail-encryption | Managed | All trails | Enable KMS encryption |
| cloud-watch-log-group-encryption | Managed | All log groups | Enable KMS encryption |
| iam-role-no-policies-attached | Custom | All custom roles | Alert (use SSM only) |
| kms-key-rotation | Managed | All CMKs | Enable annual rotation |
| restricted-ssh | Managed | All EC2 instances | Block 0.0.0.0/0 SSH |
| bedrock-model-access-restricted | Custom | Bedrock | Alert on unauthorized model IDs |

Custom Config rule for Bedrock model access restriction:
```python
def evaluate_compliance(configuration_item):
    if configuration_item['resourceType'] != 'AWS::Bedrock::ModelInvocationLogging':
        return 'NOT_APPLICABLE'
    logging_config = configuration_item.get('configuration', {})
    # Check that only Claude 3.5 Sonnet is enabled
    allowed_models = ['anthropic.claude-3-5-sonnet-20241022-v2:0']
    # Custom evaluation logic here
    return 'COMPLIANT'
```

### 4. AWS Security Hub Configuration

Enable Security Hub in the Security Tooling account as the delegated administrator:

a) Enable Standards:
   - AWS Foundational Security Best Practices (FSBP)
   - CIS AWS Foundations Benchmark v1.4
   - SOC 2 automation support (custom security standard)

b) Custom Security Hub Insight:
   - "Critical Mineral Data Exposure": Findings where resource includes "minescope" 
     AND severity.label in [CRITICAL, HIGH] AND type includes "UnauthorizedAccess"
   - "Bedrock Model Misuse": Findings related to Bedrock with severity > MEDIUM
   - "Cross-Region Data Access": Findings where principal AWS account differs from resource account

c) Automated Actions (Security Hub + EventBridge):
   - CRITICAL finding → Lambda "auto-remediate" → attempt automated fix + SNS alert
   - HIGH finding → SNS alert to security team + create JIRA ticket (via API)
   - MEDIUM finding → Log to CloudWatch for weekly review

d) Security Hub Integration:
   - Export findings to S3: s3://minescope-security-hub-findings/
   - Athena query table for historical finding analysis
   - Daily summary email via Lambda + SNS

### 5. KMS Key Management

Create a KMS key hierarchy:

```
minescope-master-key (CMK, auto-rotate annually)
├── minescope-data-key (encrypt S3 raw data)
├── minescope-dynamodb-key (encrypt DynamoDB tables)
├── minescope-cloudwatch-key (encrypt CloudWatch logs)
├── minescope-secrets-key (encrypt Secrets Manager entries)
└── minescope-cross-account-key (share with Log Archive account)
```

Key policy requirements:
- Enable cross-account use for Log Archive account only
- Require encryption context: {"Bucket": "minescope-raw-data"} for S3 key
- Disable key deletion (require 30-day waiting period + admin approval)
- Log all KMS API calls to CloudTrail

### 6. CloudTrail Configuration

Multi-region CloudTrail with:
- Log all management and data events (S3, Lambda)
- Encrypt with KMS key "minescope-cloudwatch-key"
- Send to Log Archive account via CloudTrail S3 bucket
- Enable CloudTrail Insights for unusual API call patterns
- Create CloudWatch Logs metric filter:
  ```
  [eventName="DeleteBucket"], [eventName="DeleteTable"], [eventName="DeleteFunction"]
  → Metric: "DestructiveAPICalls", Alarm if > 0 in 1 hour
  ```
- Create SNS notification for any IAM policy changes

### 7. WAF & Shield Protection

a) AWS WAF WebACL on any API Gateway or Application Load Balancer:
   - AWS managed rule group: "AWSManagedRulesCommonRuleSet" (blocks common attacks)
   - AWS managed rule group: "AWSManagedRulesSQLiRuleSet" (SQL injection)
   - AWS managed rule group: "AWSManagedRulesKnownBadInputsRuleSet" (known bad patterns)
   - Rate-based rule: 2000 requests/5 minutes per IP (prevent abuse)
   - Custom rule: Block requests with User-Agent containing known bot patterns
   - Geographic restriction: Optionally restrict by country (configurable)

b) AWS Shield Advanced:
   - Enable on Application Load Balancer (if deployed)
   - Enable on CloudFront distribution (if deployed)
   - Configure DDoS response team (DRT) access
   - Create automatic mitigation for Layer 3/4 attacks

### 8. Secrets Management

Store all sensitive configuration in AWS Secrets Manager:

| Secret Name | Contents | Rotation |
|-------------|----------|----------|
| minescope/news-api-key | External news API authentication | 90 days |
| minescope/bedrock-access | Bedrock API key (if needed beyond IAM) | No rotation (IAM-based) |
| minescope/database-credentials | RDS/Athena credentials (if RDS used) | 30 days auto |
| minescope/notification-webhook | Slack/Teams webhook for alerts | Manual |
| minescope/github-token | GitHub API for repo management | 90 days |

Use Secrets Manager Lambda rotation templates for automatic credential rotation.
Reference secrets in Lambda via environment variables (encrypted with KMS).

### 9. Data Classification & Retention

a) Data Classification Labels (applied via S3 object tags):
   - CONFIDENTIAL: risk_assessments, geo_events, pending_reviews
   - INTERNAL: price_candles, supply_status, company_benchmark
   - PUBLIC: briefings (after review), dashboard data
   - RESTRICTED: country metadata with sensitive governance indicators

b) S3 Lifecycle Policies:
   - CONFIDENTIAL: Transition to Glacier after 90 days, delete after 3 years
   - INTERNAL: Transition to IA after 30 days, Glacier after 180 days, delete after 1 year
   - PUBLIC: Keep in Standard (frequently accessed)
   - RESTRICTED: Keep in Standard with Object Lock (WORM compliance)

c) S3 Object Lock:
   - Enable on minescope-pending-reviews/ bucket (compliance mode, 1 year retention)
   - Prevents deletion or overwriting of human-reviewed risk assessments

### 10. Incident Response Playbook

Create an EventBridge + Step Functions incident response state machine:

```json
{
  "Comment": "MineScope Security Incident Response",
  "StartAt": "ClassifyIncident",
  "States": {
    "ClassifyIncident": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:*:function:minescope-classify-incident",
      "Next": "BranchBySeverity"
    },
    "BranchBySeverity": {
      "Type": "Choice",
      "Choices": [
        { "Variable": "$.severity", "StringEquals": "CRITICAL", "Next": "CriticalResponse" },
        { "Variable": "$.severity", "StringEquals": "HIGH", "Next": "HighResponse" }
      ],
      "Default": "LogAndMonitor"
    },
    "CriticalResponse": {
      "Type": "Parallel",
      "Branches": [
        { "StartAt": "IsolateResource", "States": { "IsolateResource": { "Type": "Pass", "End": true } } },
        { "StartAt": "NotifySecurityTeam", "States": { "NotifySecurityTeam": { "Type": "Pass", "End": true } } },
        { "StartAt": "CaptureForensics", "States": { "CaptureForensics": { "Type": "Pass", "End": true } } }
      ],
      "Next": "DocumentIncident"
    },
    "DocumentIncident": { "Type": "Pass", "End": true },
    "HighResponse": { "Type": "Task", "Resource": "lambda:notify-team", "End": true },
    "LogAndMonitor": { "Type": "Task", "Resource": "lambda:log-incident", "End": true }
  }
}
```

## Output Requirements

Provide complete AWS CDK (TypeScript) code:
1. Organizations stack with Control Tower configuration
2. All IAM roles, policies, and permission boundaries
3. All Config rules (managed + custom) with remediation
4. Security Hub configuration with custom insights and actions
5. KMS key hierarchy with key policies
6. CloudTrail multi-region setup with CloudWatch metric filters
7. WAF WebACL with all rule groups
8. Secrets Manager configuration with rotation Lambdas
9. S3 lifecycle policies and Object Lock configuration
10. Step Functions incident response state machine
11. GuardDuty configuration
12. Complete deployment guide with account bootstrap instructions
```

---

## What This Prompt Generates

| Component | AWS Service | Purpose |
|-----------|------------|---------|
| Account Structure | Organizations + Control Tower | Multi-account governance |
| Access Control | IAM Roles + Policies + MFA | Least-privilege permissions |
| Configuration Audit | AWS Config (14+ rules) | Continuous compliance monitoring |
| Threat Detection | Security Hub + GuardDuty | Centralized security findings |
| Encryption | KMS (5-key hierarchy) | Data-at-rest encryption |
| Audit Trail | CloudTrail + Insights | Full API call logging |
| DDoS Protection | Shield Advanced + WAF | Layer 3-7 attack mitigation |
| Secrets | Secrets Manager + Rotation | Automated credential management |
| Data Governance | S3 Lifecycle + Object Lock | Classification & retention |
| Incident Response | Step Functions + EventBridge | Automated security playbooks |

## Expected Monthly Cost

| Service | Configuration | Monthly Cost |
|---------|--------------|-------------|
| Security Hub | 2 accounts, FSBP + CIS | ~$5 |
| GuardDuty | 2 accounts | ~$5 |
| Shield Advanced | 1 resource | ~$3 |
| Config Rules | 14 rules | ~$1 |
| KMS Keys | 5 CMKs | ~$5 |
| CloudTrail | Data events + Insights | ~$3 |
| WAF | WebACL + 3 rule groups | ~$3 |
| Secrets Manager | 5 secrets | ~$0.60 |
| **Total** | | **~$26/month** |
