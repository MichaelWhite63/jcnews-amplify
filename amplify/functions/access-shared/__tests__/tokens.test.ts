import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeEqual, normalizeEmail } from '../tokens';
import { parseDuration, loadConfig } from '../config';
import { parseAllowedSources, normalizeDepartment } from '../accessList';

test('safeEqual / normalizeEmail', () => {
  assert.ok(safeEqual('abc', 'abc'));
  assert.ok(!safeEqual('abc', 'abd'));
  assert.ok(!safeEqual('abc', 'abcd'));
  assert.equal(normalizeEmail('  Alice@Example.COM '), 'alice@example.com');
});

test('parseDuration units and defaults', () => {
  assert.equal(parseDuration('90d', 0), 90 * 86400);
  assert.equal(parseDuration('10h', 0), 36000);
  assert.equal(parseDuration('5m', 0), 300);
  assert.equal(parseDuration('45s', 0), 45);
  assert.equal(parseDuration('120', 0), 120);
  assert.equal(parseDuration(undefined, 7), 7);
  assert.equal(parseDuration('', 7), 7);
  assert.throws(() => parseDuration('ten minutes', 0));
});

test('config defaults match the design and validate rotate < ttl', () => {
  const c = loadConfig({});
  assert.equal(c.sessionTtlSec, 10 * 3600);
  assert.equal(c.tokenTtlSec, 90 * 86400);
  assert.equal(c.rotateAfterSec, 60 * 86400);
  assert.equal(c.authorizerCacheTtlSec, 300);
  assert.equal(c.appBaseUrl, 'https://equity.jcnews.ai');
  assert.throws(() => loadConfig({ ACCESS_TOKEN_TTL: '1d', ACCESS_ROTATE_AFTER: '2d' }));
  assert.throws(() => loadConfig({ ACCESS_TOKEN_TTL: '15m', ACCESS_ROTATE_AFTER: '5m' }));
});

test('accessList parsing', () => {
  assert.deepEqual(parseAllowedSources('[{"Source":"A","Permission":true},{"Source":"B","Permission":false}]'), ['A']);
  assert.deepEqual(parseAllowedSources([{ Source: 'A', Permission: true }]), ['A']);
  assert.deepEqual(parseAllowedSources('not json'), []);
  assert.deepEqual(parseAllowedSources(null), []);
  assert.equal(normalizeDepartment('Options Desk'), 'options');
  assert.equal(normalizeDepartment(null), 'equity');
});
