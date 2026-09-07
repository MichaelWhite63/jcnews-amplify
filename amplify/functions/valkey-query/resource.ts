import { defineFunction } from '@aws-amplify/backend';

export const valkeyQuery = defineFunction({
  name: 'valkeyQuery',
  entry: './handler.ts',
  timeoutSeconds: 10,
  memoryMB: 256,
});
