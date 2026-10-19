import { getAccessDeps } from '../access-shared/runtime';
import { exchangeToken } from '../access-shared/service';

/** AppSync (Amplify Gen 2 a.handler.function) entry point. */
export const handler = async (event: any) => {
  const deps = await getAccessDeps();
  switch (event.fieldName) {
    case 'exchangeToken': {
      const r = await exchangeToken(deps, event.arguments?.token);
      if (r.status !== 'ok') {
        return { status: 'invalid', session: null, sessionExpiresAt: null, email: null, allowedSources: [],
                 department: null, linkToken: null, linkTokenExpiresAt: null, rotated: false };
      }
      return r;
    }
    default:
      throw new Error(`Unknown operation: ${event.fieldName}`);
  }
};
