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

/** 0 for a short story (<= SHORT chars) up to 1 for a long one (>= LONG chars). */
const SHORT_CHARS = 1000
const LONG_CHARS = 5000
const lengthFactor = (chars: number) => Math.min(1, Math.max(0, (chars - SHORT_CHARS) / (LONG_CHARS - SHORT_CHARS)))

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

  // Box height follows story length: today's height for a short story, up to twice that for a long one.
  const singleStyle = { maxHeight: `${Math.round(300 * (1 + lengthFactor(text.length)))}px` }

  // Not a Dow Jones row, or its chain is not loaded (yet) / has only this take: single-take view.
  if (!accession || !chain || chain.length < 2) {
    return (
      <div className="accordion-detail-text" style={singleStyle}>
        {accession && (article.djHot || article.djCorrected) ? (
          <div className="dj-take-head"><DjMarkers a={article} /></div>
        ) : null}
        <StoryBody text={text} />
      </div>
    )
  }

  const chainChars = chain.reduce((n, t) => n + (t.article || t.summary || '').length, 0)
  const chainVh = Math.min(90, 60 * (1 + lengthFactor(chainChars)))
  return (
    <div className="accordion-detail-text dj-chain" ref={boxRef} style={{ maxHeight: `${chainVh}vh` }}>
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
