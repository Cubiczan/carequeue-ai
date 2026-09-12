# Prompt 7: Full Infrastructure-as-Code Deployment with AWS CDK

## Metadata
- **AWS Services**: CDK (TypeScript), CloudFormation, Systems Manager, CloudWatch, S3
- **Complexity**: Expert
- **Estimated Runtime Cost**: N/A (infrastructure orchestration)
- **Category**: Infrastructure as Code, DevOps, Deployment Automation

---

## The Prompt

```
You are an AWS DevOps / Infrastructure Architect. Create a complete, production-grade Infrastructure-as-Code (IaC) deployment for the MineScope Cloud critical mineral intelligence platform using AWS CDK (TypeScript). This CDK project must orchestrate ALL infrastructure from Prompts 1-6 into a single, cohesive, deployable stack with environment management, blue/green deployments, and observability built in.

## Prerequisites

The CDK project must integrate the following systems (from previous prompts):
- Prompt 1: Lambda + EventBridge + Kinesis + SQS + S3 data pipeline
- Prompt 2: Bedrock + Claude risk analysis + Comprehend NER
- Prompt 3: QuickSight + Athena + Glue dashboard
- Prompt 4: Security Hub + IAM + Config + KMS + WAF + CloudTrail
- Prompt 5: Budgets + Cost Anomaly Detection + FinOps Lambdas
- Prompt 6: DynamoDB Global Tables + S3 CRR + Route 53 + CloudFront

## Requirements

### 1. CDK Project Structure

Create a monorepo CDK project:

```
minescope-infra/
├── cdk.json
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── PRODUCTION_DEPLOYMENT.md
├── bin/
│   └── minescope-app.ts                    # CDK App entry point
├── lib/
│   ├── stacks/
│   │   ├── MineScopePipelineStack.ts       # Prompt 1: Data pipeline
│   │   ├── MineScopeBedrockStack.ts        # Prompt 2: AI risk analysis
│   │   ├── MineScopeAnalyticsStack.ts      # Prompt 3: QuickSight + Athena
│   │   ├── MineScopeSecurityStack.ts       # Prompt 4: Security posture
│   │   ├── MineScopeFinOpsStack.ts         # Prompt 5: Cost management
│   │   ├── MineScopeDrStack.ts             # Prompt 6: Multi-region DR
│   │   └── MineScopeMonitoringStack.ts     # Cross-cutting observability
│   ├── constructs/
│   │   ├── MineScopeDataLake.ts            # Reusable S3 data lake construct
│   │   ├── MineScopeEventBus.ts            # Reusable EventBridge construct
│   │   ├── MineScopeLambdaFunction.ts      # Enhanced Lambda with Powertools
│   │   ├── MineScopeDynamoTable.ts         # Enhanced DynamoDB with GSIs + TTL
│   │   ├── MineScopeKinesisStream.ts       # Enhanced Kinesis with monitoring
│   │   └── MineScopeAlarms.ts             # Reusable CloudWatch alarm construct
│   ├── layers/
│   │   ├── minescope-utils-layer/          # Shared utility layer
│   │   └── minescope-powertools-layer/     # Lambda Powertools layer
│   └── core/
│       ├── EnvironmentConfig.ts            # Environment-specific configuration
│       ├── MineScopeProps.ts               # Shared stack props interface
│       └── Constants.ts                    # Global constants
├── lambda/
│   ├── pipeline/
│   │   ├── price-ingestor/index.ts
│   │   ├── event-ingestor/index.ts
│   │   ├── supply-ingestor/index.ts
│   │   ├── price-aggregator/index.ts
│   │   ├── event-processor/index.ts
│   │   └── supply-processor/index.ts
│   ├── bedrock/
│   │   ├── article-parser/index.ts
│   │   ├── entity-extractor/index.ts
│   │   ├── claude-risk-analyzer/index.ts
│   │   ├── alert-generator/index.ts
│   │   ├── daily-briefing-generator/index.ts
│   │   └── translation-handler/index.ts
│   ├── finops/
│   │   ├── cost-saver/index.ts
│   │   ├── bedrock-governor/index.ts
│   │   ├── right-sizing-analyzer/index.ts
│   │   └── cost-forecast/index.ts
│   ├── security/
│   │   ├── auto-tagger/index.ts
│   │   ├── incident-classifier/index.ts
│   │   └── consistency-checker/index.ts
│   └── analytics/
│       ├── company-data-exporter/index.ts
│       └── spice-refresh-trigger/index.ts
├── config/
│   ├── production.ts                       # Production environment config
│   ├── development.ts                      # Development environment config
│   └── sandbox.ts                          # Sandbox environment config
├── tests/
│   ├── pipeline.test.ts
│   ├── bedrock.test.ts
│   ├── security.test.ts
│   └── dr.test.ts
└── scripts/
    ├── bootstrap.sh                        # CDK bootstrap for multi-account
    ├── deploy-production.sh                # Production deployment pipeline
    ├── deploy-development.sh               # Development deployment
    ├── run-dr-test.sh                      # DR test orchestration
    └── validate-stack.sh                   # Pre-deployment validation
```

### 2. CDK App Entry Point (bin/minescope-app.ts)

```typescript
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MineScopePipelineStack } from '../lib/stacks/MineScopePipelineStack';
import { MineScopeBedrockStack } from '../lib/stacks/MineScopeBedrockStack';
import { MineScopeAnalyticsStack } from '../lib/stacks/MineScopeAnalyticsStack';
import { MineScopeSecurityStack } from '../lib/stacks/MineScopeSecurityStack';
import { MineScopeFinOpsStack } from '../lib/stacks/MineScopeFinOpsStack';
import { MineScopeDrStack } from '../lib/stacks/MineScopeDrStack';
import { MineScopeMonitoringStack } from '../lib/stacks/MineScopeMonitoringStack';
import { getEnvironmentConfig } from '../config';

const app = new cdk.App();

// Get environment from CDK context
const envName = app.node.tryGetContext('env') || 'development';
const config = getEnvironmentConfig(envName);

// Security Stack (deploy first — creates IAM roles, KMS keys)
const securityStack = new MineScopeSecurityStack(app, 'MineScopeSecurity', {
  env: config.primaryRegion,
  config,
  crossRegionEnvs: config.regions,
});

// Pipeline Stack (data ingestion and processing)
const pipelineStack = new MineScopePipelineStack(app, 'MineScopePipeline', {
  env: config.primaryRegion,
  config,
  eventBus: securityStack.eventBus,
  kmsKey: securityStack.dataKmsKey,
});

// Bedrock Stack (AI analysis — depends on pipeline data)
const bedrockStack = new MineScopeBedrockStack(app, 'MineScopeBedrock', {
  env: config.primaryRegion,
  config,
  dataBucket: pipelineStack.dataBucket,
  eventBus: pipelineStack.eventBus,
  articleQueue: pipelineStack.articleQueue,
  kmsKey: securityStack.dataKmsKey,
});

// Analytics Stack (QuickSight + Athena)
const analyticsStack = new MineScopeAnalyticsStack(app, 'MineScopeAnalytics', {
  env: config.primaryRegion,
  config,
  dataBucket: pipelineStack.dataBucket,
  dynamodbTables: pipelineStack.dynamoTables,
});

// FinOps Stack (cost management)
const finOpsStack = new MineScopeFinOpsStack(app, 'MineScopeFinOps', {
  env: config.primaryRegion,
  config,
});

// DR Stack (multi-region replication)
const drStack = new MineScopeDrStack(app, 'MineScopeDR', {
  env: config.primaryRegion,
  config,
  pipelineStack,
  securityStack,
});

// Monitoring Stack (cross-cutting observability)
const monitoringStack = new MineScopeMonitoringStack(app, 'MineScopeMonitoring', {
  env: config.primaryRegion,
  config,
  allStacks: [pipelineStack, bedrockStack, analyticsStack, securityStack, finOpsStack, drStack],
});

// Tags applied to ALL resources
cdk.Tags.of(app).add('Project', 'MineScope');
cdk.Tags.of(app).add('Environment', config.environmentName);
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('DataClassification', 'Confidential');
cdk.Tags.of(app).add('CostCenter', config.costCenter);
```

### 3. Environment Configuration System

Create typed configuration for each environment:

```typescript
// lib/core/EnvironmentConfig.ts
import * as cdk from 'aws-cdk-lib';

export interface MineScopeEnvironmentConfig {
  environmentName: 'production' | 'development' | 'sandbox';
  primaryRegion: cdk.Environment;
  secondaryRegion?: cdk.Environment;
  tertiaryRegion?: cdk.Environment;
  regions: cdk.Environment[];
  costCenter: string;
  alarmEmail: string;
  pagerDutyEndpoint?: string;
  bedrock: {
    claudeModelId: string;
    maxTokensPerAnalysis: number;
    dailyTokenBudget: {
      input: number;
      output: number;
    };
    minConfidenceForAnalysis: 'low' | 'medium' | 'high';
  };
  kinesis: {
    shardCount: number;
    retentionHours: number;
  };
  lambda: {
    memorySize: {
      low: number;    // 128 MB
      medium: number;  // 512 MB
      high: number;    // 1024 MB
    };
    timeout: {
      short: number;   // 30s
      medium: number;  // 5min
      long: number;    // 15min
    };
    architecture: 'arm64';
  };
  budgets: {
    monthlyLimit: number;
    alertThresholds: number[];
    bedrockLimit: number;
  };
  quicksight: {
    refreshIntervalMinutes: number;
    enableAnonymousEmbedding: boolean;
  };
  dynamodb: {
    enableGlobalTables: boolean;
    pitrEnabled: boolean;
  };
}
```

Production config example:
```typescript
export const productionConfig: MineScopeEnvironmentConfig = {
  environmentName: 'production',
  primaryRegion: { account: 'PROD_ACCOUNT_ID', region: 'us-east-1' },
  secondaryRegion: { account: 'PROD_ACCOUNT_ID', region: 'eu-west-1' },
  tertiaryRegion: { account: 'PROD_ACCOUNT_ID', region: 'ap-southeast-1' },
  regions: [
    { account: 'PROD_ACCOUNT_ID', region: 'us-east-1' },
    { account: 'PROD_ACCOUNT_ID', region: 'eu-west-1' },
    { account: 'PROD_ACCOUNT_ID', region: 'ap-southeast-1' },
  ],
  costCenter: 'cc-1001',
  alarmEmail: 'oncall@minescope.cloud',
  pagerDutyEndpoint: 'https://events.pagerduty.com/integration/...',
  bedrock: {
    claudeModelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    maxTokensPerAnalysis: 4096,
    dailyTokenBudget: { input: 500000, output: 200000 },
    minConfidenceForAnalysis: 'medium',
  },
  kinesis: { shardCount: 4, retentionHours: 24 },
  lambda: {
    memorySize: { low: 128, medium: 512, high: 1024 },
    timeout: { short: 30, medium: 300, long: 900 },
    architecture: 'arm64',
  },
  budgets: { monthlyLimit: 800, alertThresholds: [50, 75, 90, 100], bedrockLimit: 200 },
  quicksight: { refreshIntervalMinutes: 15, enableAnonymousEmbedding: false },
  dynamodb: { enableGlobalTables: true, pitrEnabled: true },
};
```

### 4. Custom CDK Constructs

Create reusable constructs with best practices:

a) **MineScopeLambdaFunction** construct:
   ```typescript
   export class MineScopeLambdaFunction extends lambda.Function {
     constructor(scope: Construct, id: string, props: MineScopeLambdaProps) {
       super(scope, id, {
         runtime: lambda.Runtime.NODEJS_20_X,
         architecture: lambda.Architecture.ARM_64,
         handler: 'index.handler',
         timeout: props.timeout || cdk.Duration.seconds(30),
         memorySize: props.memorySize || 256,
         environment: {
           POWERTOOLS_SERVICE_NAME: props.serviceName || id,
           POWERTOOLS_METRICS_NAMESPACE: 'MineScope',
           LOG_LEVEL: props.logLevel || 'INFO',
           ...props.environment,
         },
         layers: [
           awsLambdaPowertoolsLayer, // Lambda Powertools for TypeScript
           minescopeUtilsLayer,
         ],
         tracing: lambda.Tracing.ACTIVE, // X-Ray tracing
         insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0,
         deadLetterQueue: props.dlq,
         retryAttempts: 2,
         onFailure: props.onFailureDestination
           ? new SnsDestination(props.onFailureDestination)
           : undefined,
         ...props,
       });
     }
   }
   ```

b) **MineScopeDynamoTable** construct:
   ```typescript
   export class MineScopeDynamoTable extends dynamodb.Table {
     constructor(scope: Construct, id: string, props: MineScopeDynamoProps) {
       super(scope, id, {
         partitionKey: props.partitionKey,
         sortKey: props.sortKey,
         billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
         encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
         encryptionKey: props.kmsKey,
         pointInTimeRecovery: props.enablePitr ?? true,
         stream: props.enableStream 
           ? dynamodb.StreamViewType.NEW_AND_OLD_IMAGES 
           : undefined,
         removalPolicy: props.removalPolicy || cdk.RemovalPolicy.RETAIN,
         timeToLiveAttribute: props.ttlAttribute,
       });

       // Add Global Secondary Indexes
       props.globalSecondaryIndexes?.forEach(gsi => {
         this.addGlobalSecondaryIndex({
           indexName: gsi.indexName,
           partitionKey: gsi.partitionKey,
           sortKey: gsi.sortKey,
           projectionType: gsi.projectionType || dynamodb.ProjectionType.ALL,
         });
       });
     }
   }
   ```

c) **MineScopeDataLake** construct:
   ```typescript
   export class MineScopeDataLake extends cdk.Construct {
     public readonly rawBucket: s3.Bucket;
     public readonly analyticsBucket: s3.Bucket;
     public readonly briefingsBucket: s3.Bucket;
     
     constructor(scope: Construct, id: string, props: MineScopeDataLakeProps) {
       super(scope, id);
       
       this.rawBucket = new s3.Bucket(this, 'RawData', {
         bucketName: `minescope-raw-data-${props.accountId}-${cdk.Stack.of(this).region}`,
         encryption: s3.BucketEncryption.S3_MANAGED,
         versioned: true,
         intelligentTieringEnabled: true,
         lifecycleRules: [
           { id: 'archive-old-data', transitions: [
             { storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: cdk.Duration.days(30) },
             { storageClass: s3.StorageClass.GLACIER, transitionAfter: cdk.Duration.days(90) },
           ], expiration: cdk.Duration.days(365) },
         ],
         removalPolicy: cdk.RemovalPolicy.RETAIN,
         publicReadAccess: false,
         blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
         serverAccessLogsPrefix: 'access-logs/',
       });
       
       // Similar for analyticsBucket, briefingsBucket...
     }
   }
   ```

### 5. Cross-Stack References

Implement secure cross-stack resource sharing:

```typescript
// In MineScopeBedrockStack, access pipeline resources:
const pipelineStack = cdk.Stack.of(this).node.findChild('MineScopePipeline') as MineScopePipelineStack;

// Or use explicit stack outputs:
// In MineScopePipelineStack:
this.dataBucketArnOutput = new cdk.CfnOutput(this, 'DataBucketArn', {
  value: this.dataBucket.bucketArn,
  exportName: 'MineScope-DataBucketArn',
});

// In MineScopeBedrockStack:
const dataBucketArn = cdk.Fn.importValue('MineScope-DataBucketArn');
const dataBucket = s3.Bucket.fromBucketArn(this, 'ImportedDataBucket', dataBucketArn);
```

### 6. Deployment Pipeline (CI/CD)

Create a CodePipeline/CodeBuild pipeline for automated deployment:

a) **Pipeline Stages**:

```
Source (GitHub)
  ↓
Build (CodeBuild: npm install, compile, lint, unit test)
  ↓
Security Scan (CodeBuild: cdk-nag, checkov)
  ↓
Deploy Dev (CDK deploy to sandbox account)
  ↓
Integration Tests (CodeBuild: run against sandbox)
  ↓
Manual Approval (Slack notification)
  ↓
Deploy Prod (CDK deploy to production account — us-east-1)
  ↓
Deploy DR (CDK deploy to eu-west-1, ap-southeast-1)
  ↓
Smoke Tests (CodeBuild: health check + data validation)
  ↓
Notify Success (SNS → Slack/Email)
```

b) **CodeBuild Build Spec** (partial):
```yaml
version: 0.2
phases:
  install:
    commands:
      - npm install -g aws-cdk@2
      - npm ci
  build:
    commands:
      - npx tsc --noEmit
      - npm run lint
      - npm test
      - cdk synth --all --context env=production
  post_build:
    commands:
      - npx cdk-nag minescope-app-cdk-stack  # Security check
artifacts:
  files:
    - 'cdk.out/**/*'
    - 'lambda/**/*'
```

c) **cdk-nag Configuration**:
Enable cdk-nag for security compliance:
```typescript
import { NagSuppressions } from 'cdk-nag';

// Suppress known acceptable findings
NagSuppressions.addResourceSuppressions(securityStack, [
  { id: 'AwsSolutions-IAM5', reason: 'Wildcard needed for CloudWatch PutMetricData with namespace condition' },
  { id: 'AwsSolutions-S1', reason: 'Access logs enabled via separate bucket' },
]);
```

### 7. Parameter Store Configuration

Store environment-specific configuration in SSM Parameter Store:

```typescript
// Created by CDK in SecurityStack:
const claudeModelParam = new ssm.StringParameter(this, 'ClaudeModelId', {
  parameterName: '/minescope/bedrock/claude-model',
  stringValue: config.bedrock.claudeModelId,
  tier: ssm.ParameterTier.STANDARD,
});

const tokenBudgetParam = new ssm.StringParameter(this, 'DailyTokenBudget', {
  parameterName: '/minescope/bedrock/daily-token-budget',
  stringValue: JSON.stringify(config.bedrock.dailyTokenBudget),
  tier: ssm.ParameterTier.STANDARD,
});

// Lambda functions read config at runtime:
const modelId = ssm.StringParameter.fromStringParameterName(this, 'ModelId', 
  `/minescope/bedrock/claude-model`).stringValue;
```

### 8. Custom Resource Providers

Create custom resources for operations not natively supported by CDK:

a) **QuickSight Dataset/Refresh Configuration**:
   - Custom resource to create SPICE datasets
   - Custom resource to set incremental refresh schedules

b) **Bedrock Guardrails Configuration**:
   - Custom resource to create and configure Bedrock guardrails
   - Custom resource to attach guardrails to model invocation

c) **EventBridge Cross-Region Bus Peering**:
   - Custom resource to create cross-region event forwarding

### 9. Observability — X-Ray Tracing

Enable distributed tracing across all Lambda functions:

```typescript
// All Lambda functions have tracing enabled (see construct above)
// X-Ray service map will show:
// API Gateway → Lambda (price-ingestor) → Kinesis → Lambda (price-aggregator) → DynamoDB
// S3 → Lambda (article-parser) → SQS → Lambda (claude-risk-analyzer) → Bedrock → DynamoDB
// CloudFront → API Gateway → Lambda → Athena → S3
```

Create X-Ray groups and annotations:
```typescript
new xray.Group(this, 'MineScopeCriticalPath', {
  filterExpression: 'annotation.critical = "true"',
});

new xray.Group(this, 'MineScopeHighLatency', {
  filterExpression: 'response_time > 5s',
});
```

### 10. Disaster Recovery Orchestration

Create a Step Functions workflow for automated DR testing:

```typescript
const drTestStateMachine = new sfn.StateMachine(this, 'DRTestOrchestrator', {
  definition: new sfn.Choice(this, 'ChooseTestType')
    .when(sfn.Condition.stringEquals('$.testType', 'health-check'), 
      new sfn.Task(this, 'RunHealthCheck', {
        resource: new LambdaInvoke(this, 'InvokeHealthCheck', { lambdaFunction: healthCheckFn }),
      })
    )
    .when(sfn.Condition.stringEquals('$.testType', 'full-failover'), 
      new sfn.Sequence(this, 'FullFailoverSequence')
        .chain(new sfn.Task(this, 'SnapshotState', { ... }))
        .chain(new sfn.Task(this, 'DisablePrimary', { ... }))
        .chain(new sfn.Task(this, 'VerifySecondaryActive', { ... }))
        .chain(new sfn.Wait(this, 'Wait15Minutes', { time: sfn.WaitTime.duration(cdk.Duration.minutes(15)) }))
        .chain(new sfn.Task(this, 'ValidateData', { ... }))
        .chain(new sfn.Task(this, 'RestorePrimary', { ... }))
        .chain(new sfn.Task(this, 'ValidateSync', { ... }))
        .chain(new sfn.Task(this, 'GenerateReport', { ... }))
    )
    .otherwise(new sfn.Succeed(this, 'UnknownTest')),
});
```

## Output Requirements

Provide the complete CDK project:

1. **bin/minescope-app.ts** — Full CDK app with all stacks wired together
2. **All 7 stack files** — Complete TypeScript implementation for each stack
3. **All 5 custom constructs** — Reusable building blocks
4. **Lambda Powertools layer** — Shared utilities
5. **3 environment configs** — production, development, sandbox
6. **cdk.json** — CDK configuration with context variables
7. **package.json** — All dependencies
8. **tsconfig.json** — TypeScript configuration
9. **Build pipeline** — CodePipeline/CodeBuild configuration (CloudFormation or CDK)
10. **cdk-nag suppressions** — Justified security exceptions
11. **X-Ray groups** — Distributed tracing configuration
12. **SSM Parameter Store entries** — Runtime configuration
13. **Custom resources** — For QuickSight, Bedrock, cross-region operations
14. **Unit tests** — Jest tests for constructs
15. **Integration test scripts** — Post-deployment validation
16. **COMPLETE deployment guide** with:
    - Prerequisites (Node.js, CDK CLI, AWS credentials)
    - Bootstrap instructions for multi-account
    - Step-by-step deployment commands
    - Post-deployment verification checklist
    - Rollback procedures
    - DR runbook
    - Troubleshooting guide

The CDK project must pass `cdk synth --all` without errors and produce valid CloudFormation templates for all stacks.
```

---

## What This Prompt Generates

| Component | Technology | Purpose |
|-----------|-----------|---------|
| CDK App | AWS CDK v2 (TypeScript) | Complete infrastructure orchestration |
| 7 Stacks | CDK Stacks | One per architectural domain |
| 5 Constructs | CDK Constructs | Reusable building blocks (Lambda, DynamoDB, S3, etc.) |
| Lambda Powertools | Lambda Layers | Structured logging, tracing, metrics |
| CI/CD Pipeline | CodePipeline + CodeBuild | Automated deployment with security gates |
| Environment Config | TypeScript + SSM | Typed configuration per environment |
| cdk-nag | Security Scanning | Automated security compliance checks |
| X-Ray | Distributed Tracing | End-to-end request tracing |
| DR Automation | Step Functions | Automated disaster recovery testing |
| Custom Resources | Lambda-backed CR | QuickSight, Bedrock, cross-region ops |

## Deployment Workflow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  GitHub   │───▶│  Build   │───▶│ Security │───▶│  Deploy  │───▶│  Smoke   │
│  Push     │    │  & Test  │    │  Scan    │    │  (CDK)   │    │  Tests   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                   npm test       cdk-nag        prod account    health checks
                   tsc check      checkov         + DR regions   data validation
```

## Key Commands

```bash
# Bootstrap all accounts/regions
./scripts/bootstrap.sh

# Deploy to development
cdk deploy MineScopeSecurity MineScopePipeline MineScopeBedrock \
  --context env=development --require-approval never

# Deploy to production
./scripts/deploy-production.sh

# Run DR test
./scripts/run-dr-test.sh --type health-check
./scripts/run-dr-test.sh --type full-failover

# Destroy sandbox
cdk destroy --all --context env=sandbox
```
