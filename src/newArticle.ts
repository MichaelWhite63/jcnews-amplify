/** A row counts as "new" for this long after the article's own timestamp (not browser receipt time). */
export const NEW_ARTICLE_HIGHLIGHT_MS = 120000

/** How often the UI re-evaluates "new" so the highlight clears without new data arriving. */
export const NEW_ARTICLE_TICK_MS = 15000

/**
 * True while `nowMs - timestamp` is within [0, NEW_ARTICLE_HIGHLIGHT_MS).
 * Timestamps up to a minute in the future (clock skew) count as new; anything further
 * ahead, or unparseable, does not.
 */
export const NEW_ARTICLE_MAX_SKEW_MS = 60000
export const isNewArticle = (iso: string | null | undefined, nowMs: number): boolean => {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (isNaN(t)) return false
  const age = nowMs - t
  return age < NEW_ARTICLE_HIGHLIGHT_MS && age > -NEW_ARTICLE_MAX_SKEW_MS
}
