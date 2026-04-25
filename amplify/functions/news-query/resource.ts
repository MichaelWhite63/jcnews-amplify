import { defineFunction } from '@aws-amplify/backend';

export const newsQuery = defineFunction({
  name: 'newsQuery',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    NODE_ENV: 'production',
    SECRET_NAME: 'in4m/rds/credentials',
  },
});
