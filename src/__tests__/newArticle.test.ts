import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNewArticle, NEW_ARTICLE_HIGHLIGHT_MS, NEW_ARTICLE_MAX_SKEW_MS } from '../newArticle'

const T = Date.parse('2026-11-06T15:00:00.000Z')
const iso = (offsetMs: number) => new Date(T + offsetMs).toISOString()

test('highlight duration is 2 minutes', () => assert.equal(NEW_ARTICLE_HIGHLIGHT_MS, 120000))

test('just inside 2 minutes is new', () => {
  assert.equal(isNewArticle(iso(-(NEW_ARTICLE_HIGHLIGHT_MS - 1)), T), true)
  assert.equal(isNewArticle(iso(0), T), true)
})

test('exactly 2 minutes and just outside are not new', () => {
  assert.equal(isNewArticle(iso(-NEW_ARTICLE_HIGHLIGHT_MS), T), false)
  assert.equal(isNewArticle(iso(-(NEW_ARTICLE_HIGHLIGHT_MS + 1)), T), false)
})

test('small future timestamps (clock skew) are new; far-future ones are not', () => {
  assert.equal(isNewArticle(iso(5000), T), true)
  assert.equal(isNewArticle(iso(NEW_ARTICLE_MAX_SKEW_MS - 1), T), true)
  assert.equal(isNewArticle(iso(NEW_ARTICLE_MAX_SKEW_MS), T), false)
  assert.equal(isNewArticle(iso(24 * 3600 * 1000), T), false)
})

test('missing or invalid timestamps are not new', () => {
  assert.equal(isNewArticle('', T), false)
  assert.equal(isNewArticle(undefined, T), false)
  assert.equal(isNewArticle('not a date', T), false)
})
