// Dow Jones story chaining helpers. Pure functions, no React.
// Rows without dj fields (djAccessionNumber == null) pass through every helper untouched.

export interface DjFields {
  djAccessionNumber?: string | null
  djSeq?: number | null
  djTakeId?: string | null
  djHot?: boolean | null
  djCorrected?: boolean | null
  djTemp?: boolean | null
  djDisplayTime?: string | null
  djCodes?: string | null
}

type Take = DjFields & { id: number; publishedDate: string; ticker?: string }

// Oldest first. dj_seq decides when both takes carry it (live publishNewArticle payloads may not),
// otherwise fall back to time, then row id.
const takeOrder = (a: Take, b: Take) => {
  const bySeq = a.djSeq != null && b.djSeq != null ? a.djSeq - b.djSeq : 0
  return bySeq
    || new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
    || a.id - b.id
}

/** Time to show for a row: dj_display_time when present, else createdAt (publishedDate). */
export const displayTimeOf = (a: { publishedDate: string } & DjFields): string =>
  a.djDisplayTime || a.publishedDate

/** "Oct 30, 11:52 PM ET" */
export const formatET = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const text = d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${text} ET`
}

/** Dow Jones product of a take ("20261030:DN:12349" -> "DN"). Accession numbers repeat across products. */
export const productOf = (a: DjFields): string => a.djTakeId?.split(':')[1] ?? ''

/**
 * One row per story (accession + product + ticker): keep only the latest take (highest dj_seq) of each accession number.
 * Rows with no accession number are kept as they are. Relative order of the survivors is preserved.
 */
export function collapseToLatestTake<T extends Take>(rows: T[]): T[] {
  const keyOf = (r: T) => (r.djAccessionNumber ? `${r.djAccessionNumber}|${productOf(r)}|${r.ticker ?? ''}` : null)
  const latest = new Map<string, T>()
  for (const r of rows) {
    const key = keyOf(r)
    if (!key) continue
    const cur = latest.get(key)
    if (!cur || takeOrder(r, cur) > 0) latest.set(key, r)
  }
  return rows.filter(r => { const k = keyOf(r); return !k || latest.get(k) === r })
}

/** Unique takes (by dj_take_id, falling back to row id), oldest first. */
export function orderChain<T extends Take>(rows: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of rows) {
    const key = r.djTakeId || `id:${r.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out.sort(takeOrder)
}

/** Does this take match the one the user selected (same take, any ticker's copy)? */
export const isSameTake = (a: Take, b: Take): boolean =>
  a.djTakeId && b.djTakeId ? a.djTakeId === b.djTakeId : a.id === b.id

export type BodySegment = { kind: 'text'; text: string } | { kind: 'pre'; text: string }

const PRE_RE = /<pre\s+class="dj-fixed"\s*>([\s\S]*?)<\/pre>/gi

/**
 * Split article text into plain-text and fixed-width segments. Only <pre class="dj-fixed"> is
 * recognised; everything else (including any other markup) stays plain text, which the UI renders
 * as an escaped React text node. Nothing is ever injected as HTML.
 */
export function splitBody(raw: string): BodySegment[] {
  const text = (raw || '').replace(/\r\n|\r/g, '\n')
  const out: BodySegment[] = []
  let last = 0
  for (const m of text.matchAll(PRE_RE)) {
    const start = m.index ?? 0
    if (start > last) out.push({ kind: 'text', text: trimBreak(text.slice(last, start), 'end') })
    out.push({ kind: 'pre', text: m[1].replace(/^\n/, '') })
    last = start + m[0].length
  }
  if (last < text.length) out.push({ kind: 'text', text: trimBreak(text.slice(last), 'start') })
  return out.filter(s => s.kind === 'pre' || s.text.length > 0)
}

// The newline that separates a <pre> block from its neighbours is layout, not content.
function trimBreak(s: string, side: 'start' | 'end'): string {
  return side === 'end' ? s.replace(/\n$/, '') : s.replace(/^\n/, '')
}

export interface NewsArticle extends DjFields {
  id: number
  ticker: string
  headline: string
  summary: string
  article: string
  publishedDate: string
  source: string
  url: string
  importance: string
  category: string
}

/** Copy the dj fields of an API / subscription payload onto a NewsArticle-shaped object. */
export const pickDj = (a: any): DjFields => ({
  djAccessionNumber: a?.djAccessionNumber ?? null,
  djSeq:             a?.djSeq ?? null,
  djTakeId:          a?.djTakeId ?? null,
  djHot:             a?.djHot ?? null,
  djCorrected:       a?.djCorrected ?? null,
  djTemp:            a?.djTemp ?? null,
  djDisplayTime:     a?.djDisplayTime ?? null,
  djCodes:           a?.djCodes ?? null,
})
