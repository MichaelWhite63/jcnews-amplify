// Static inflation data — Apr 30, 2026
const inflationData = {
  asOf: 'Apr 30, 2026',
  us: [
    { label: 'CPI Y/Y', value: '3.2%' },
    { label: 'Core CPI Y/Y', value: '3.1%' },
    { label: 'PCE Deflator Y/Y', value: '2.8%' },
    { label: 'Core PCE Y/Y', value: '2.7%' },
    { label: 'PPI Y/Y', value: '2.4%' },
  ],
  international: [
    { label: 'Eurozone CPI Y/Y', value: '2.6%' },
    { label: 'UK CPI Y/Y', value: '3.1%' },
    { label: 'ECB Rate', value: '2.00%' },
    { label: 'BOE Rate', value: '3.75%' },
    { label: 'EMU PPI Y/Y', value: '-3.0%' },
  ],
}

export default function InflationPanel() {
  return (
    <aside className="security-panel">
      <h2>Inflation</h2>
      <p className="panel-as-of">As of {inflationData.asOf}</p>
      <div className="security-info-grid">
        <div className="info-group">
          <h4>United States</h4>
          {inflationData.us.map(item => (
            <div className="detail-item" key={item.label}>
              <strong>{item.label}:</strong>
              <span className="detail-item-value">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="info-group">
          <h4>International</h4>
          {inflationData.international.map(item => (
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
