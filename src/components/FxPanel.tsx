// Static FX data — Apr 30, 2026
const fxData = {
  asOf: 'Apr 30, 2026  11:50 GMT',
  majors: [
    { pair: 'EUR/USD', rate: '1.1715', chg: '+0.34%' },
    { pair: 'USD/JPY', rate: '155.89', chg: '-2.83%' },
    { pair: 'GBP/USD', rate: '1.3526', chg: '+0.37%' },
    { pair: 'USD/CHF', rate: '0.7844', chg: '-0.88%' },
    { pair: 'USD/CAD', rate: '1.3656', chg: '-0.20%' },
    { pair: 'AUD/USD', rate: '0.7155', chg: '+0.56%' },
  ],
  other: [
    { pair: 'USD/CNY', rate: '6.8264', chg: '-0.16%' },
    { pair: 'USD/MXN', rate: '17.489', chg: '-0.21%' },
    { pair: 'USD/BRL', rate: '4.9947', chg: '-0.48%' },
    { pair: 'USD/ZAR', rate: '16.732', chg: '-0.51%' },
  ],
}

export default function FxPanel() {
  return (
    <aside className="security-panel">
      <h2>FX Rates</h2>
      <p className="panel-as-of">As of {fxData.asOf}</p>
      <div className="security-info-grid">
        <div className="info-group">
          <h4>Major Pairs</h4>
          {fxData.majors.map(item => (
            <div className="detail-item" key={item.pair}>
              <strong>{item.pair}:</strong>
              <span className="detail-item-value">
                {item.rate}
                <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: item.chg.startsWith('+') ? '#4ade80' : '#f87171' }}>
                  {item.chg}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="info-group">
          <h4>EM &amp; Other</h4>
          {fxData.other.map(item => (
            <div className="detail-item" key={item.pair}>
              <strong>{item.pair}:</strong>
              <span className="detail-item-value">
                {item.rate}
                <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: item.chg.startsWith('+') ? '#4ade80' : '#f87171' }}>
                  {item.chg}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
