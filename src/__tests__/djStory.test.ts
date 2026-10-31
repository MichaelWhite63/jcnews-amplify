import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collapseToLatestTake, orderChain, splitBody, formatET, displayTimeOf, isSameTake } from '../djStory'

const row = (id: number, o: Record<string, unknown> = {}) => ({
  id, ticker: 'MVLY US', publishedDate: `2026-10-31T03:${String(id % 60).padStart(2, '0')}:00.000Z`, ...o,
})

test('collapse keeps the latest take per story and ticker, preserving order', () => {
  const rows = [
    row(5, { djAccessionNumber: 'A', djSeq: 3 }),
    row(4, { djAccessionNumber: 'A', djSeq: 2 }),
    row(3, { djAccessionNumber: 'B', djSeq: 1 }),
    row(2, { djAccessionNumber: 'A', djSeq: 1 }),
    row(1, { djAccessionNumber: 'A', djSeq: 9, ticker: 'BAC US' }),
  ]
  assert.deepEqual(collapseToLatestTake(rows).map(r => r.id), [5, 3, 1])
})

test('collapse keeps different products that share an accession number apart', () => {
  const rows = [
    row(2, { djAccessionNumber: 'A', djSeq: 12353, djTakeId: '20261030:DN:12353' }),
    row(1, { djAccessionNumber: 'A', djSeq: 12353, djTakeId: '20261030:SN:12353' }),
  ]
  assert.equal(collapseToLatestTake(rows).length, 2)
})

test('collapse: live take without dj_seq still wins over older rows that have one', () => {
  const older = row(10, { djAccessionNumber: 'A', djSeq: 4 })
  const live = { ...row(11, { djAccessionNumber: 'A' }), publishedDate: '2026-10-31T04:30:00.000Z' }
  assert.deepEqual(collapseToLatestTake([live, older]).map(r => r.id), [11])
})

test('rows with NULL dj fields pass through untouched', () => {
  const rows = [row(3), row(2, { djAccessionNumber: null }), row(1, { djAccessionNumber: undefined })]
  assert.deepEqual(collapseToLatestTake(rows), rows)
  assert.equal(displayTimeOf(rows[0]), rows[0].publishedDate)
})

test('orderChain: oldest first, deduped across tickers by take id', () => {
  const rows = [
    row(30, { djTakeId: 'x:DN:3', djSeq: 3 }),
    row(21, { djTakeId: 'x:DN:2', djSeq: 2, ticker: 'BAC US' }),
    row(20, { djTakeId: 'x:DN:2', djSeq: 2 }),
    row(10, { djTakeId: 'x:DN:1', djSeq: 1 }),
  ]
  assert.deepEqual(orderChain(rows).map(r => r.id), [10, 21, 30])
})

test('isSameTake matches another ticker copy by take id, else by row id', () => {
  assert.ok(isSameTake(row(1, { djTakeId: 't' }), row(2, { djTakeId: 't' })))
  assert.ok(!isSameTake(row(1, { djTakeId: 't' }), row(1, { djTakeId: 'u' })))
  assert.ok(isSameTake(row(1), row(1)))
})

test('displayTimeOf prefers dj_display_time; formatET renders Eastern', () => {
  const r = row(1, { djDisplayTime: '2026-10-31T03:52:03.501Z' })
  assert.equal(displayTimeOf(r), '2026-10-31T03:52:03.501Z')
  assert.equal(formatET('2026-10-31T03:52:03.501Z'), 'Oct 30, 11:52 PM ET') // EDT, UTC-4
  assert.equal(formatET('2026-11-02T03:52:00Z'), 'Nov 1, 10:52 PM ET')      // EST after DST ends, UTC-5
})

test('splitBody: plain text is one segment', () => {
  assert.deepEqual(splitBody('a\nb'), [{ kind: 'text', text: 'a\nb' }])
})

test('splitBody: pre dj-fixed keeps spaces and newlines exactly; neighbours trimmed of the joining newline', () => {
  const pre = '   -- 3Q net income of $1.2 million \n \n   -- 3Q NII of $8.4 million'
  const segs = splitBody(`Intro line.\n<pre class="dj-fixed">${pre}</pre>\nOutro`)
  assert.deepEqual(segs, [
    { kind: 'text', text: 'Intro line.' },
    { kind: 'pre', text: pre },
    { kind: 'text', text: 'Outro' },
  ])
})

test('splitBody: other markup is never interpreted', () => {
  const segs = splitBody('<script>alert(1)</script> <pre class="evil">x</pre> <b>y</b>')
  assert.deepEqual(segs, [{ kind: 'text', text: '<script>alert(1)</script> <pre class="evil">x</pre> <b>y</b>' }])
})

test('splitBody: empty and multiple blocks', () => {
  assert.deepEqual(splitBody(''), [])
  const segs = splitBody('<pre class="dj-fixed">a</pre><pre class="dj-fixed">b</pre>')
  assert.deepEqual(segs.map(s => s.kind), ['pre', 'pre'])
})
