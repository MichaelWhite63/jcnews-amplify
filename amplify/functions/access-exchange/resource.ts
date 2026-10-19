import { defineFunction } from '@aws-amplify/backend';
import { accessFunctionEnv } from '../access-shared/functionEnv';

/** Handles the pre-login operation exchangeToken. */
export const accessExchange = defineFunction({
  name: 'accessExchange',
  entry: './handler.ts',
  timeoutSeconds: 15,
  memoryMB: 256,
  environment: accessFunctionEnv(),
});
