import { defineFunction, secret } from '@aws-amplify/backend';

export const newsQuery = defineFunction({
  name: 'newsQuery',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    NODE_ENV: 'production',
    DB_HOST:      secret('DB_HOST'),
    DB_PORT:      secret('DB_PORT'),
    SQL_DATABASE: secret('SQL_DATABASE'),
    SQL_USER:     secret('SQL_USER'),
    SQL_PASSWORD: secret('SQL_PASSWORD'),
  },
});
