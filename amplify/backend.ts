import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { newsQuery } from './functions/news-query/resource';
import { valkeyQuery } from './functions/valkey-query/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { CfnSecurityGroup } from 'aws-cdk-lib/aws-ec2';

const backend = defineBackend({
  auth,
  data,
  newsQuery,
  valkeyQuery,
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
  groupDescription: 'valkeyQuery Lambda — outbound to Valkey port 6379',
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
