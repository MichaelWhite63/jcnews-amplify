import { getAuthorizerDeps } from '../access-shared/runtime';
import { authorizeRequest } from '../access-shared/service';

/**
 * AppSync Lambda authorizer: verifies the session JWT signature/expiry only (no MySQL). Fails closed: any error -> isAuthorized false.
 * Event: { authorizationToken, requestContext: { apiId, accountId, requestId, queryString, operationName, variables } }
 */
export const handler = async (event: { authorizationToken?: string }) => {
  try {
    const deps = await getAuthorizerDeps();
    return authorizeRequest(deps, event.authorizationToken);
  } catch (err) {
    console.error(JSON.stringify({ msg: 'authorizer.error', error: String(err) }));
    return { isAuthorized: false, ttlOverride: 0 };
  }
};
