// Static oil market data — Apr 28, 2026
const oilData = {
  asOf: 'Apr 28, 2026',
  prices: [
    { label: 'WTI Crude', value: '$101.27 / bbl', trend: '▲' },
    { label: 'Brent Crude', value: '$105.50 / bbl', trend: '▲' },
    { label: 'WTI/Brent Spread', value: '-$4.23', trend: '—' },
    { label: 'Natural Gas (Henry Hub)', value: '$3.42 / MMBtu', trend: '▼' },
  ],
  supply: [
    { label: 'OPEC+ Production', value: '26.8 mb/d' },
    { label: 'EIA Inventory Change', value: '-2.1 mb (draw)' },
    { label: 'Baker Hughes Rig Count', value: '583' },
    { label: 'Refinery Utilization', value: '87.2%' },
  ],
}

export default function OilPanel() {
  return (
    <aside className="security-panel">
      <h2>Oil Market</h2>
      <p className="panel-as-of">As of {oilData.asOf}</p>
      <div className="security-info-grid">
        <div className="info-group">
          <h4>Prices</h4>
          {oilData.prices.map(item => (
            <div className="detail-item" key={item.label}>
              <strong>{item.label}:</strong>
              <span className="detail-item-value">{item.trend} {item.value}</span>
            </div>
          ))}
        </div>
        <div className="info-group">
          <h4>Supply &amp; Demand</h4>
          {oilData.supply.map(item => (
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
