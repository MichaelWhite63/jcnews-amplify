// Static rates data — Apr 30, 2026
const ratesData = {
  asOf: 'Apr 30, 2026',
  policy: [
    { label: 'Fed Funds Rate', value: '4.50 – 4.75%' },
    { label: 'BOE Rate', value: '3.75%' },
    { label: 'ECB Rate', value: '2.00%' },
  ],
  yields: [
    { label: '2-Year Treasury', value: '3.90%' },
    { label: '10-Year Treasury', value: '4.40%' },
    { label: 'Yield Curve (10Y–2Y)', value: '+0.50%' },
    { label: '30-Year Mortgage', value: '6.85%' },
  ],
  macro: [
    { label: 'US CPI (latest)', value: '3.2% YoY' },
  ],
}

export default function RatesPanel() {
  return (
    <aside className="security-panel">
      <h2>Rates &amp; Yields</h2>
      <p className="panel-as-of">As of {ratesData.asOf}</p>
      <div className="security-info-grid">
        <div className="info-group">
          <h4>Policy Rates</h4>
          {ratesData.policy.map(item => (
            <div className="detail-item" key={item.label}>
              <strong>{item.label}:</strong>
              <span className="detail-item-value">{item.value}</span>
            </div>
          ))}
          <h4 style={{ marginTop: '1rem' }}>Macro</h4>
          {ratesData.macro.map(item => (
            <div className="detail-item" key={item.label}>
              <strong>{item.label}:</strong>
              <span className="detail-item-value">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="info-group">
          <h4>Treasury Yields</h4>
          {ratesData.yields.map(item => (
            <div className="detail-item" key={item.label}>
              <strong>{item.label}:</strong>
              <span className="detail-item-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
