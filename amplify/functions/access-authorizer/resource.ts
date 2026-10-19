import { defineFunction } from '@aws-amplify/backend';
import { accessFunctionEnv } from '../access-shared/functionEnv';

/** AppSync Lambda authorizer for browser sessions (authMode 'lambda'). */
export const accessAuthorizer = defineFunction({
  name: 'accessAuthorizer',
  entry: './handler.ts',
  timeoutSeconds: 10,
  memoryMB: 256,
  environment: accessFunctionEnv(),
});
