// Static employment data — Apr 30, 2026
const employmentData = {
  asOf: 'Apr 30, 2026',
  us: [
    { label: 'Unemployment Rate', value: '4.1%' },
    { label: 'Non-Farm Payrolls', value: '+177K (Mar)' },
    { label: 'Initial Jobless Claims', value: '212K (wk est.)' },
    { label: 'Participation Rate', value: '62.7%' },
    { label: 'Avg Hourly Earnings Y/Y', value: '+3.8%' },
    { label: 'U-6 Underemployment', value: '7.9%' },
  ],
  international: [
    { label: 'Canada Unemployment', value: '6.7%' },
    { label: 'UK Unemployment', value: '4.4%' },
    { label: 'Eurozone Unemployment', value: '6.1%' },
    { label: 'Colombia Unemployment', value: '9.2%' },
  ],
}

export default function EmploymentPanel() {
  return (
    <aside className="security-panel">
      <h2>Employment</h2>
      <p className="panel-as-of">As of {employmentData.asOf}</p>
      <div className="security-info-grid">
        <div className="info-group">
          <h4>United States</h4>
          {employmentData.us.map(item => (
            <div className="detail-item" key={item.label}>
              <strong>{item.label}:</strong>
              <span className="detail-item-value">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="info-group">
          <h4>International</h4>
          {employmentData.international.map(item => (
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
