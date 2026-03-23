import { useState, useEffect, useRef } from 'react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import GeopoliticalRiskDashboard from './components/GeopoliticalRiskDashboard'
import './App.css'

interface NewsArticle {
  id: number
  ticker: string
  headline: string
  summary: string
  publishedDate: string
  source: string
  url: string
  importance: string
  category: string
}

interface Security {
  ticker: string
  companyName: string
  sector: string
  industry: string
  exchange: string
  earningsDate: string
  exDivDate: string
  exDivAmount: string
  shortInterest: string
  shortRatio: string
  primaryExchange: string
  avgDailyVolume: string
  cusip: string
  isin: string
  indexes: string
}

interface TickerNewsData {
  security: Security | null
  newsArticles: NewsArticle[]
}

interface RelatedCompany {
  ticker: string
  companyName: string
}

function App() {
  const client = generateClient<Schema>()
  const initialTicker = new URLSearchParams(window.location.search).get('ticker') || 'AAPL US'
  const [data, setData] = useState<TickerNewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticker, setTicker] = useState(initialTicker)
  const [searchTicker, setSearchTicker] = useState(initialTicker)
  const [relatedCompanies, setRelatedCompanies] = useState<RelatedCompany[]>([])
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false)
  const [showOilDashboard, setShowOilDashboard] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const industryButtonRef = useRef<HTMLButtonElement>(null)
  const articleWindowRef = useRef<Window | null>(null)
  const articleCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openArticle = (url: string) => {
    if (articleCloseTimerRef.current) {
      clearTimeout(articleCloseTimerRef.current)
    }
    articleWindowRef.current = window.open(url, 'jcnews-article')
    if (articleWindowRef.current) {
      articleCloseTimerRef.current = setTimeout(() => {
        try { articleWindowRef.current?.close() } catch { /* blocked */ }
      }, 30000)
    }
  }
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return !window.matchMedia('(prefers-color-scheme: light)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode)
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    // Load search history from localStorage
    const saved = localStorage.getItem('tickerSearchHistory')
    if (saved) {
      setSearchHistory(JSON.parse(saved))
    }
    fetchTickerNews()
  }, [])

  const processTicker = (tickerValue: string): string => {
    const trimmed = tickerValue.trim()
    // If ticker already has a space and exchange suffix (e.g., "MSFT US", "TSX CN"), return as-is
    if (trimmed.includes(' ')) {
      return trimmed
    }
    // If ticker doesn't have a space, add " US" suffix
    return `${trimmed} US`
  }

  const addToSearchHistory = (tickerValue: string) => {
    const newHistory = [tickerValue, ...searchHistory.filter(t => t !== tickerValue)].slice(0, 12)
    setSearchHistory(newHistory)
    localStorage.setItem('tickerSearchHistory', JSON.stringify(newHistory))
  }

  const fetchTickerNews = async (tickerToFetch?: string) => {
    const tickerValue = tickerToFetch || searchTicker
    setLoading(true)
    setError(null)
    setShowIndustryDropdown(false)

    try {
      const { data: result, errors } = await client.queries.getTickerNews({
        ticker: tickerValue,
        limit: 10
      })

      if (errors) {
        throw new Error(errors[0].message)
      }

      setData(result as TickerNewsData)

      // Add to search history
      addToSearchHistory(tickerValue)

      // Fetch related companies if we have industry info
      if (result?.security?.industry) {
        fetchRelatedCompanies(result.security.industry)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      console.error('Error fetching ticker news:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedCompanies = async (industry: string) => {
    try {
      console.log('Fetching related companies for industry:', industry)
      const { data: companies, errors } = await client.queries.getCompaniesByIndustry({
        industry: industry
      })

      if (errors) {
        console.error('Error fetching related companies:', errors)
        return
      }

      console.log('Related companies received:', companies)
      setRelatedCompanies((companies || []) as RelatedCompany[])
    } catch (err) {
      console.error('Error fetching related companies:', err)
    }
  }

  const selectCompany = (companyTicker: string) => {
    setTicker(companyTicker)
    setSearchTicker(companyTicker)
    setShowIndustryDropdown(false)
    // Trigger fetch with the new ticker
    fetchTickerNews(companyTicker)
  }

  const selectFromHistory = (historicalTicker: string) => {
    setTicker(historicalTicker)
    setSearchTicker(historicalTicker)
    fetchTickerNews(historicalTicker)
  }

  const toggleIndustryDropdown = () => {
    if (!showIndustryDropdown && industryButtonRef.current) {
      const rect = industryButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 5,
        left: rect.left - 160 // Position relative to where the button is
      })
    }
    setShowIndustryDropdown(!showIndustryDropdown)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading ticker data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => fetchTickerNews()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="split-container">
        {/* Left Side - Ticker Search & News Table */}
        <section className="news-table-section">
          <div className="ticker-selector">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const processedTicker = processTicker(ticker)
                  setTicker(processedTicker)
                  setSearchTicker(processedTicker)
                  fetchTickerNews(processedTicker)
                }
              }}
              placeholder="Enter ticker (e.g., AAPL US)"
            />
            <button onClick={() => {
              const processedTicker = processTicker(ticker)
              setTicker(processedTicker)
              setSearchTicker(processedTicker)
              fetchTickerNews(processedTicker)
            }}>Search</button>
            <button className="theme-toggle" onClick={() => setDarkMode(d => !d)} title="Toggle dark mode">
              {darkMode ? '☀' : '☾'}
            </button>

            {searchHistory.length > 0 && (
              <div className="search-history">
                {searchHistory.map((historyTicker, index) => (
                  <span
                    key={index}
                    className={`history-item ${historyTicker === searchTicker ? 'active' : ''}`}
                    onClick={() => selectFromHistory(historyTicker)}
                  >
                    {historyTicker}
                  </span>
                ))}
              </div>
            )}
          </div>

          {data?.newsArticles && data.newsArticles.length > 0 ? (
            <div className="news-table">
              <table>
                <thead>
                  <tr>
                    <th>Summary</th>
                    <th>Category</th>
                    <th>Importance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.newsArticles.map((article) => (
                    <tr
                      key={article.id}
                      title={`${article.headline}\n${article.source} - ${formatDate(article.publishedDate)}`}
                      onClick={() => article.url && openArticle(article.url)}
                      style={{ cursor: article.url ? 'pointer' : 'default' }}
                    >
                      <td className="summary-cell">{article.summary}</td>
                      <td className="category-cell">{article.category ? article.category.substring(0, 4) : '-'}</td>
                      <td className="importance-cell">
                        {article.importance ? (() => {
                          const n = Number(article.importance)
                          const label = n <= 3 ? 'High' : n <= 6 ? 'Medium' : 'Low'
                          const cls = n <= 3 ? 'importance-high' : n <= 6 ? 'importance-mid' : 'importance-low'
                          return <span className={`importance-badge ${cls}`}>{label}</span>
                        })() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-news">No news articles found for this ticker.</p>
          )}
        </section>

        {/* Right Side - Security Information */}
        <aside className="security-panel">
          {data?.security ? (
            <>
              <h2>{data.security.companyName}</h2>
              <div className="security-info-grid">
                <div className="info-group">
                  <h4>Trading Info</h4>
                  {data.security.avgDailyVolume && (
                    <div className="detail-item">
                      <strong>Avg Daily Volume:</strong>
                      <span className="detail-item-value">{parseInt(data.security.avgDailyVolume).toLocaleString()}</span>
                    </div>
                  )}
                  {data.security.earningsDate && (
                    <div className="detail-item">
                      <strong>Earnings Date:</strong>
                      <span className="detail-item-value">{formatDateOnly(data.security.earningsDate)}</span>
                    </div>
                  )}
                  {data.security.exDivDate && (
                    <div className="detail-item">
                      <strong>Ex-Div Date:</strong>
                      <span className="detail-item-value">
                        {formatDateOnly(data.security.exDivDate)}
                      </span>
                    </div>
                  )}
                  {data.security.exDivAmount && (
                    <div className="detail-item">
                      <strong>Div Amount:</strong>
                      <span className="detail-item-value">${parseFloat(data.security.exDivAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {data.security.shortInterest && (
                    <div className="detail-item">
                      <strong>Short Interest:</strong>
                      <span className="detail-item-value">{parseInt(data.security.shortInterest).toLocaleString()}</span>
                    </div>
                  )}
                  {data.security.shortRatio && (
                    <div className="detail-item">
                      <strong>Short Ratio:</strong>
                      <span className="detail-item-value">{parseFloat(data.security.shortRatio).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="info-group">
                  <h4>Company Info</h4>
                  <div className="detail-item">
                    <strong>Sector:</strong>
                    <span className="detail-item-value">{data.security.sector || 'N/A'}</span>
                  </div>
                  <div className="industry-selector">
                    <strong>Industry:</strong>
                    <span className="industry-value">
                      <span className="detail-item-value">{data.security.industry || 'N/A'}</span>
                      {relatedCompanies.length > 0 && (
                        <button
                          ref={industryButtonRef}
                          className="industry-dropdown-btn"
                          onClick={toggleIndustryDropdown}
                          title="View related companies"
                        >
                          ▼
                        </button>
                      )}
                    </span>
                    {showIndustryDropdown && relatedCompanies.length > 0 && (
                      <div
                        className="industry-dropdown"
                        style={{
                          top: `${dropdownPosition.top}px`,
                          left: `${dropdownPosition.left}px`
                        }}
                      >
                        <div className="industry-dropdown-header">
                          Related Companies ({relatedCompanies.length})
                        </div>
                        <div className="industry-dropdown-list">
                          {relatedCompanies.map((company) => (
                            <div
                              key={company.ticker}
                              className="industry-dropdown-item"
                              onClick={() => selectCompany(company.ticker)}
                            >
                              <span className="dropdown-name">{company.companyName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {data.security.primaryExchange && (
                    <div className="detail-item">
                      <strong>Primary Exchange:</strong>
                      <span className="detail-item-value">{data.security.primaryExchange}</span>
                    </div>
                  )}
                </div>

                <div className="info-group">
                  <h4>Identifiers</h4>
                  {data.security.cusip && (
                    <div className="detail-item">
                      <strong>CUSIP:</strong>
                      <span className="detail-item-value">{data.security.cusip}</span>
                    </div>
                  )}
                  {data.security.isin && (
                    <div className="detail-item">
                      <strong>ISIN:</strong>
                      <span className="detail-item-value">{data.security.isin}</span>
                    </div>
                  )}
                  {data.security.indexes && (
                    <div className="detail-item">
                      <strong>Indexes:</strong>
                      <span className="detail-item-value">{data.security.indexes}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p>No security information available</p>
          )}
          <div className="oil-btn-container">
            <button
              className={`oil-btn${showOilDashboard ? ' active' : ''}`}
              onClick={() => setShowOilDashboard(v => !v)}
            >
              Oil
            </button>
          </div>
        </aside>
      </div>

      {showOilDashboard && (
        <div className="oil-modal-backdrop" onClick={() => setShowOilDashboard(false)}>
          <div className="oil-modal" onClick={e => e.stopPropagation()}>
            <button className="oil-modal-close" onClick={() => setShowOilDashboard(false)}>✕</button>
            <GeopoliticalRiskDashboard />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
