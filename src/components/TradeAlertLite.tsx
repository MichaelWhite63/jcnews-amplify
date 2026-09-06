// DEMO ONLY — remove after demonstration

type Direction = 'BUY' | 'SELL' | '?'

interface Alert {
  direction: Direction
  ticker: string
  headline: string
  detail: string
}

const alerts: Alert[] = [
  {
    direction: 'SELL',
    ticker: 'XOM',
    headline: 'Likely seller 600 Jul 31 115 Puts @ $2.02 (22% IV, Ref $118.42), OI Covers.',
    detail: '-600 Jul 31 115P @ $2.02 MIAX 15:05:50.000 Vega=133',
  },
  {
    direction: 'BUY',
    ticker: 'META',
    headline: 'Likely buyer 750 Aug 21 760 Calls @ $24.30 (32% IV, Ref $741.20), OI Covers.',
    detail: '+750 Aug 21 760C @ $24.30 ARCA 15:05:25.000 Vega=2,005',
  },
  {
    direction: 'BUY',
    ticker: 'SPY',
    headline: 'Likely buyer 2.0k Sep 18 600/620 Put Spread @ $3.35 (18% IV, Ref $634.18), OI Covers.',
    detail: '+2000 Sep 18 620P @ $9.40 / -2000 Sep 18 600P @ $6.05 PHLX 15:05:17.000 Vega=3,399 floor-paired · legs 47s apart',
  },
  {
    direction: 'BUY',
    ticker: 'TSLA',
    headline: 'Likely buyer 1.2k Jul 17 340 Calls @ $11.40 (51% IV, Ref $328.55), Exceeds OI — likely opening.',
    detail: '+1200 Jul 17 340C @ $11.40 CBOE 15:05:10.000 Vega=1,505',
  },
  {
    direction: 'BUY',
    ticker: 'NVDA',
    headline: 'Likely buyer 1.5k Aug 21 185 Straddle @ $16.55 (45% IV, Ref $184.62), possible opening.',
    detail: '+1500 Aug 21 185C @ $8.90 / +1500 Aug 21 185P @ $7.65 ISE 15:03:30.140 Vega=2,731',
  },
  {
    direction: 'SELL',
    ticker: 'BAC',
    headline: 'Likely seller 5.0k Dec 19 34/45 Call Spread @ $0.24 (20% IV, Ref $33.49), OI Covers.',
    detail: '-5000 Dec 19 34C @ $0.53 / +5000 Dec 19 45C @ $0.29 CBOE 15:01:30.180 Vega=452',
  },
  {
    direction: 'BUY',
    ticker: 'TSLA',
    headline: 'Likely buyer 750 Aug 21 300 Puts @ $9.27 (48% IV, Ref $328.55), OI Covers.',
    detail: '+750 Aug 21 300P @ $9.27 ARCA 14:52:18.651 Vega=765',
  },
  {
    direction: '?',
    ticker: 'NVDA',
    headline: '(Direction unclear) 750 Aug 21 190 Calls @ $8.63 (45% IV, Ref $184.62), OI Covers.',
    detail: '±750 Aug 21 190C @ $8.63 ARCA 14:29:09.653 Vega=712',
  },
  {
    direction: 'BUY',
    ticker: 'COST',
    headline: 'Likely buyer 500 Aug 21 1020 Puts @ $22.03 (19% IV, Ref $1044.15), OI Covers.',
    detail: '+500 Aug 21 1020P @ $22.03 MIAX 14:17:05.909 Vega=1,212',
  },
  {
    direction: 'SELL',
    ticker: 'AMZN',
    headline: 'Likely seller 1.0k Jul 31 235 Calls @ $6.13 (29% IV, Ref $228.55), OI Covers.',
    detail: '-1000 Jul 31 235C @ $6.13 CBOE 14:02:25.711 Vega=674',
  },
]

const badgeStyle = (direction: Direction): React.CSSProperties => {
  const bg = direction === 'BUY' ? '#1e6b1e' : direction === 'SELL' ? '#8b1a1a' : '#6b5a00'
  const color = direction === 'BUY' ? '#6ddc6d' : direction === 'SELL' ? '#ff7070' : '#ffd700'
  return {
    background: bg,
    color,
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: 'bold',
    borderRadius: '2px',
    letterSpacing: '0.03em',
    flexShrink: 0,
  }
}

export default function TradeAlertLite() {
  return (
    <div style={{ fontFamily: "'Courier New', Courier, monospace", padding: '1rem 1.25rem', overflowY: 'auto', height: '100%', fontSize: '0.875rem' }}>
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
        MIN CONTRACTS (SMALL SIDE)
        <span style={{ border: '1px solid var(--border)', padding: '2px 10px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
          500
        </span>
      </div>

      {alerts.map((alert, i) => (
        <div key={i} style={{ marginBottom: '0.9rem', lineHeight: '1.5' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>&gt;&gt;</span>
            <span style={badgeStyle(alert.direction)}>{alert.direction}</span>
            <span style={{ color: 'var(--text-primary)' }}>
              <strong>{alert.ticker}:</strong> {alert.headline}
            </span>
          </div>
          <div style={{ marginLeft: '3.25rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {alert.detail}
          </div>
        </div>
      ))}
    </div>
  )
}
