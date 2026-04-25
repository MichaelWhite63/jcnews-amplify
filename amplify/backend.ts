import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { newsQuery } from './functions/news-query/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  data,
  newsQuery
});

backend.newsQuery.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-2:585768142838:secret:in4m/rds/credentials*'],
  })
);
