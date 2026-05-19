// Static trade data — week ending Apr 23, 2026
const tradeData = {
  asOf: 'Week ending Apr 23, 2026',
  balance: [
    { label: 'US Trade Balance', value: '-$68.9B (Feb)' },
    { label: 'US Exports Y/Y', value: '+4.2%' },
    { label: 'US Imports Y/Y', value: '+3.1%' },
  ],
  agExports: [
    { label: 'Wheat (wk net)', value: '226.1K MT' },
    { label: 'Corn (wk net)', value: '1,598K MT' },
    { label: 'Soybeans (wk net)', value: '258.1K MT' },
    { label: 'Soymeal (wk net)', value: '294.9K MT' },
    { label: 'Upland Cotton (wk net)', value: '162.9K bales' },
    { label: 'Rice (wk net)', value: '39.0K MT' },
  ],
}

export default function TradePanel() {
  return (
    <aside className="security-panel">
      <h2>Trade</h2>
      <p className="panel-as-of">As of {tradeData.asOf}</p>
      <div className="security-info-grid">
        <div className="info-group">
          <h4>Trade Balance</h4>
          {tradeData.balance.map(item => (
            <div className="detail-item" key={item.label}>
              <strong>{item.label}:</strong>
              <span className="detail-item-value">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="info-group">
          <h4>Ag Export Sales</h4>
          {tradeData.agExports.map(item => (
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
