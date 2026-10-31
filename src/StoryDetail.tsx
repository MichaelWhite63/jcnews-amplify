import { useEffect, useRef, useState } from 'react'
import StoryBody from './StoryBody'
import { type NewsArticle, displayTimeOf, formatET, isSameTake, orderChain } from './djStory'

export function DjMarkers({ a }: { a: NewsArticle }) {
  return (
    <>
      {a.djHot ? <span className="dj-marker dj-marker--hot" title="Hot story">HOT</span> : null}
      {a.djCorrected ? <span className="dj-marker dj-marker--corrected" title="Corrected">CORRECTED</span> : null}
    </>
  )
}

interface Props {
  article: NewsArticle
  /** Fetch every take of a story (oldest first, any ticker's copy deduped). */
  loadChain: (accessionNumber: string, takeId?: string | null) => Promise<NewsArticle[]>
}

/**
 * Body of an expanded article row. Rows without dj fields render exactly as before (text only).
 * Dow Jones rows show the whole story chain oldest-first, the selected take highlighted and scrolled to.
 */
export default function StoryDetail({ article, loadChain }: Props) {
  const accession = article.djAccessionNumber
  const [chain, setChain] = useState<NewsArticle[] | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const selRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setChain(null)
    if (!accession) return
    let cancelled = false
    loadChain(accession, article.djTakeId)
      .then(rows => { if (!cancelled) setChain(orderChain(rows)) })
      .catch(err => console.error('[chain] failed to load story takes:', err))
    return () => { cancelled = true }
  }, [accession, article.id])

  // Bring the selected take into view inside the scrolling box (not the page); the box is the offsetParent.
  useEffect(() => {
    const box = boxRef.current, sel = selRef.current
    if (box && sel) box.scrollTop = Math.max(0, sel.offsetTop - 8)
  }, [chain])

  const text = article.article || article.summary || ''

  // Not a Dow Jones row, or its chain is not loaded (yet) / has only this take: single-take view.
  if (!accession || !chain || chain.length < 2) {
    return (
      <div className="accordion-detail-text">
        {accession && (article.djHot || article.djCorrected) ? (
          <div className="dj-take-head"><DjMarkers a={article} /></div>
        ) : null}
        <StoryBody text={text} />
      </div>
    )
  }

  return (
    <div className="accordion-detail-text dj-chain" ref={boxRef}>
      {chain.map((t, i) => {
        const selected = isSameTake(t, article)
        return (
          <div
            key={t.djTakeId || t.id}
            ref={selected ? selRef : undefined}
            className={`dj-take${selected ? ' dj-take--selected' : ''}`}
          >
            <div className="dj-take-head">
              <span className="dj-take-num">Take {i + 1} of {chain.length}</span>
              <span className="dj-take-time">{formatET(displayTimeOf(t))}</span>
              <DjMarkers a={t} />
            </div>
            {t.headline ? <div className="dj-take-headline">{t.headline}</div> : null}
            <StoryBody text={t.article || t.summary || ''} />
          </div>
        )
      })}
    </div>
  )
}
