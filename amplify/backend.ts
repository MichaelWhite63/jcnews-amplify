import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { newsQuery } from './functions/news-query/resource';
import { valkeyQuery } from './functions/valkey-query/resource';
import { accessExchange } from './functions/access-exchange/resource';
import { accessAuthorizer } from './functions/access-authorizer/resource';
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { CfnSecurityGroup } from 'aws-cdk-lib/aws-ec2';

const backend = defineBackend({
  auth,
  data,
  newsQuery,
  valkeyQuery,
  accessExchange,
  accessAuthorizer,
});

// Existing: allow newsQuery Lambda to read RDS credentials from Secrets Manager
backend.newsQuery.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-2:585768142838:secret:in4m/rds/credentials*'],
  })
);

// Place valkeyQuery Lambda inside the VPC so it can reach ElastiCache
const valkeyLambda = backend.valkeyQuery.resources.lambda;
const stack = valkeyLambda.stack;

// Security group: allows outbound TCP 6379 to the VPC (Valkey cluster)
// After deploy, add a matching inbound rule on the Valkey cluster's security group
// allowing TCP 6379 from this security group's ID.
const lambdaSG = new CfnSecurityGroup(stack, 'ValkeyQueryLambdaSG', {
  groupDescription: 'valkeyQuery Lambda - outbound to Valkey port 6379',
  vpcId: 'vpc-023f30cf6c642dc59',
  securityGroupEgress: [
    {
      ipProtocol: 'tcp',
      fromPort: 6379,
      toPort: 6379,
      cidrIp: '172.31.0.0/16',  // default VPC CIDR covering all three subnets
    },
  ],
});

const cfnFunction = valkeyLambda.node.defaultChild as CfnFunction;
cfnFunction.vpcConfig = {
  subnetIds: [
    'subnet-0a799f7ca5fe95368',
    'subnet-00417206063209efe',
    'subnet-0ea25ec75b676b041',
  ],
  securityGroupIds: [lambdaSG.ref],
};

// Lambda needs EC2 permissions to manage its VPC network interfaces
valkeyLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'ec2:CreateNetworkInterface',
      'ec2:DescribeNetworkInterfaces',
      'ec2:DeleteNetworkInterface',
    ],
    resources: ['*'],
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Browser access (phase 1): token exchange + Lambda authorizer
// ─────────────────────────────────────────────────────────────────────────────
const ACCOUNT_REGION_PREFIX = 'arn:aws:secretsmanager:us-east-2:585768142838:secret:';
const dbSecretName  = process.env.ACCESS_DB_SECRET_NAME  || 'in4m/rds/credentials';
const jwtSecretName = process.env.ACCESS_JWT_SECRET_NAME || 'jcnews/access/jwt';

const linkSecretName = process.env.ACCESS_LINK_SECRET_NAME || 'jcnews/access/link-hmac';
const secretArn = (name: string) => `${ACCOUNT_REGION_PREFIX}${name}-*`; // Secrets Manager appends a 6-char suffix

// exchangeToken: DB (one persons read), session JWT key, link HMAC key.
backend.accessExchange.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: [secretArn(dbSecretName), secretArn(jwtSecretName), secretArn(linkSecretName)],
  })
);
// Authorizer: verifies the session JWT only — no DB or link-key access.
backend.accessAuthorizer.resources.lambda.addToRolePolicy(
  new PolicyStatement({ actions: ['secretsmanager:GetSecretValue'], resources: [secretArn(jwtSecretName)] })
);

// ── WAF: 100 requests / 5 min per IP, scoped to exchangeToken only ──
// Disable for a sandbox with ACCESS_WAF=off (WAF costs ~$5/month per web ACL + $1/rule).
// NOTE: an AppSync API can have only ONE web ACL. If one is already attached in the
// console, add the rule below to that ACL instead of deploying this one.
if ((process.env.ACCESS_WAF ?? 'on').toLowerCase() !== 'off') {
  // Kept in the data stack to avoid a cross-stack reference to the API ARN.
  const wafStack = backend.data.stack;
  const limit = Number(process.env.ACCESS_WAF_LIMIT || 100);

  // Match on the parsed JSON "query" value so JSON \u escapes cannot hide the field name.
  const queryContains = (field: string): CfnWebACL.StatementProperty => ({
    byteMatchStatement: {
      fieldToMatch: {
        jsonBody: {
          matchPattern: { includedPaths: ['/query'] },
          matchScope: 'VALUE',
          invalidFallbackBehavior: 'EVALUATE_AS_STRING',
          oversizeHandling: 'MATCH',
        },
      },
      positionalConstraint: 'CONTAINS',
      searchString: field,
      textTransformations: [{ priority: 0, type: 'NONE' }],
    },
  });

  const acl = new CfnWebACL(wafStack, 'AccessRateLimitAcl', {
    scope: 'REGIONAL',
    defaultAction: { allow: {} },
    visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'jcnewsAccessAcl', sampledRequestsEnabled: true },
    rules: [
      {
        name: 'AccessOpsRateLimitPerIp',
        priority: 0,
        action: { block: {} },
        statement: {
          rateBasedStatement: {
            limit,
            evaluationWindowSec: 300,
            aggregateKeyType: 'IP',
            scopeDownStatement: {
              ...queryContains('exchangeToken'),
            },
          },
        },
        visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'jcnewsAccessOpsRate', sampledRequestsEnabled: true },
      },
    ],
  });

  new CfnWebACLAssociation(wafStack, 'AccessRateLimitAclAssociation', {
    resourceArn: backend.data.resources.graphqlApi.arn,
    webAclArn: acl.attrArn,
  });
}
