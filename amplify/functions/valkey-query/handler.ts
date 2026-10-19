import { Cluster } from 'ioredis';
import { sessionIdentity } from '../access-shared/identity';

const VALKEY_HOST = 'clustercfg.nodebasedin4mvalkeycache.q2icyp.use2.cache.amazonaws.com';
const VALKEY_PORT = 6379;

// Reuse cluster connection across warm Lambda invocations
let cluster: Cluster | null = null;

function getCluster(): Cluster {
  if (!cluster) {
    cluster = new Cluster(
      [{ host: VALKEY_HOST, port: VALKEY_PORT }],
      {
        redisOptions: {
          tls: { rejectUnauthorized: false },
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
        },
        dnsLookup: (address, callback) => callback(null, address),
      }
    );
    cluster.on('error', (err) => console.error('[valkey] cluster error:', err));
  }
  return cluster;
}

export const handler = async (event: any): Promise<string[]> => {
  // Browser sessions: use the verified email from the Lambda authorizer, not the argument.
  const email = sessionIdentity(event)?.email ?? event.arguments?.email;
  if (!email) return [];

  try {
    const redis = getCluster();
    const members = await redis.smembers(`interestList:${email}`);
    console.log(`[valkey] interestList:${email} → ${members.length} tickers`);
    return members;
  } catch (err) {
    console.error('[valkey] getTickersOfInterest error:', err);
    return [];
  }
};
