import { useState, useEffect, useRef, useMemo } from 'react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import GeopoliticalRiskDashboard from './components/GeopoliticalRiskDashboard'
import EIADashboard from './components/EIADashboard'
import OilPanel from './components/OilPanel'
import RatesPanel from './components/RatesPanel'
import FxPanel from './components/FxPanel'
import InflationPanel from './components/InflationPanel'
import EmploymentPanel from './components/EmploymentPanel'
import TradePanel from './components/TradePanel'
import { type DowJonesArticle } from './data/dowJonesData'
import './App.css'

interface NewsArticle {
  id: number
  ticker: string
  headline: string
  summary: string
  article: string
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

const VIEW_TO_SCREEN_KEY: Record<string, string> = {
  oil_news:        'oil',
  rates_news:      'rates',
  fx_news:         'fx',
  inflation_news:  'inflation',
  employment_news: 'employment',
  trade_news:      'trade',
}

function getPrevTradeDateCutoff(): Date {
  const now = new Date()
  const day = now.getDay() // 0=Sun,1=Mon,...,6=Sat
  const daysBack = day === 0 ? 2 : day === 1 ? 3 : 1  // Sun→Fri, Mon→Fri, else yesterday
  const prev = new Date(now)
  prev.setDate(now.getDate() - daysBack)
  prev.setHours(16, 0, 0, 0)  // 4:00 PM
  return prev
}

function App() {
  const client = generateClient<Schema>({ authMode: 'iam' })
  const initialTicker = new URLSearchParams(window.location.search).get('ticker') || 'AAPL US'
  const initialCountryCode = initialTicker.includes(' ') ? initialTicker.split(' ').pop()! : 'US'
  const [defaultCountryCode, setDefaultCountryCode] = useState(initialCountryCode)
  const [data, setData] = useState<TickerNewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticker, setTicker] = useState(initialTicker.split(' ')[0])
  const [searchTicker, setSearchTicker] = useState(initialTicker)
  const [relatedCompanies, setRelatedCompanies] = useState<RelatedCompany[]>([])
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false)
  const [showOilDashboard, setShowOilDashboard] = useState(false)
  const [showEIADashboard, setShowEIADashboard] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)
  const [selectedDjArticle, setSelectedDjArticle] = useState<DowJonesArticle | null>(null)
  const [activeView, setActiveView] = useState<'db' | 'oil_news' | 'rates_news' | 'fx_news' | 'inflation_news' | 'employment_news' | 'trade_news'>('db')
  const [macroArticles, setMacroArticles] = useState<DowJonesArticle[]>([])
  const [macroLoading, setMacroLoading] = useState(false)
  const [importanceFilter, setImportanceFilter] = useState<string>('All')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [unreadScreens, setUnreadScreens] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('unreadScreens')
    return saved ? JSON.parse(saved) : {}
  })
  const industryButtonRef = useRef<HTMLButtonElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const articleWindowRef = useRef<Window | null>(null)
  const articleCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeScreenKeyRef = useRef<string>(initialTicker)

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
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('tickerSearchHistory')
    return saved ? JSON.parse(saved) : []
  })
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
    localStorage.setItem('unreadScreens', JSON.stringify(unreadScreens))
  }, [unreadScreens])

  useEffect(() => {
    activeScreenKeyRef.current = activeView === 'db'
      ? searchTicker
      : (VIEW_TO_SCREEN_KEY[activeView] ?? activeView)
  }, [activeView, searchTicker])

  useEffect(() => {
    let sub: any
    try {
      const observable = (client as any).subscriptions?.onNewArticle?.()
      console.log('[sub] observable:', observable)
      if (!observable) {
        console.warn('[sub] onNewArticle not available on client.subscriptions')
        return
      }
      sub = observable.subscribe({
        next: (raw: any) => {
          console.log('[sub] raw payload:', JSON.stringify(raw))
          const article = raw?.data?.onNewArticle ?? raw?.onNewArticle ?? raw
          console.log('[sub] article:', article)
          if (!article || typeof article !== 'object') return
          const key: string = article.screen || article.ticker
          if (!key) return
          console.log('[sub] key:', key, '| active:', activeScreenKeyRef.current)

          const macroScreens = Object.values(VIEW_TO_SCREEN_KEY)
          if (article.screen && macroScreens.includes(article.screen)) {
            if (article.screen === activeScreenKeyRef.current) {
              // Currently viewing this macro screen — prepend the article immediately
              setMacroArticles(prev => [{
                id:            article.id ?? Date.now(),
                headline:      article.headline      || '',
                publishedDate: article.publishedDate || new Date().toISOString(),
                body:          article.article       || article.report || '',
                industry:      '',
                source:        (article.screen + '_news') as DowJonesArticle['source'],
              }, ...prev])
            } else {
              setUnreadScreens(prev => ({ ...prev, [article.screen]: true }))
            }
            return
          }

          // Ticker article
          if (key === activeScreenKeyRef.current) {
            // Currently viewing this ticker — prepend to the news table
            setData(prev => {
              if (!prev) return prev
              const newArticle = {
                id:            article.id            ?? Date.now(),
                ticker:        article.ticker         || '',
                headline:      article.headline       || '',
                summary:       article.summary        || '',
                article:       article.article        || '',
                publishedDate: article.publishedDate  || new Date().toISOString(),
                source:        article.source         || '',
                url:           article.url            || '',
                importance:    article.importance     || '',
                category:      article.category       || '',
              }
              return { ...prev, newsArticles: [newArticle, ...(prev.newsArticles ?? [])] }
            })
          } else {
            setUnreadScreens(prev => ({ ...prev, [key]: true }))
          }
        },
        error: (err: any) => console.error('[sub] error:', JSON.stringify(err, null, 2), err),
      })
      console.log('[sub] subscribed:', sub)
    } catch (e) {
      console.error('[sub] setup error:', e)
    }
    return () => sub?.unsubscribe?.()
  }, [])

  useEffect(() => {
    document.title = `JC News - ${ticker}`
  }, [ticker])

  useEffect(() => {
    if (!tableScrollRef.current) return
    // Recalculate height after data loads then scroll to bottom
    const top = tableScrollRef.current.getBoundingClientRect().top
    const available = window.innerHeight - top - 24
    tableScrollRef.current.style.maxHeight = `${Math.max(available, 200)}px`
    tableScrollRef.current.scrollTop = 0
  }, [data])

  useEffect(() => {
    const updateTableHeight = () => {
      if (!tableScrollRef.current) return
      const top = tableScrollRef.current.getBoundingClientRect().top
      const available = window.innerHeight - top - 24 // 24px bottom padding
      tableScrollRef.current.style.maxHeight = `${Math.max(available, 200)}px`
    }
    updateTableHeight()
    window.addEventListener('resize', updateTableHeight)
    return () => window.removeEventListener('resize', updateTableHeight)
  }, [])

  useEffect(() => {
    fetchTickerNews()
  }, [])

  const processTicker = (tickerValue: string): string => {
    const trimmed = tickerValue.trim()
    if (trimmed.includes(' ')) {
      const code = trimmed.split(' ').pop()!
      setDefaultCountryCode(code)
      return trimmed
    }
    return `${trimmed} ${defaultCountryCode}`
  }

  const clearUnread = (key: string) => {
    setUnreadScreens(prev => prev[key] ? { ...prev, [key]: false } : prev)
  }

  const screenFromView = (view: string) => view.replace('_news', '')

  const fetchMacroNews = async (view: string) => {
    const screen = screenFromView(view)
    setMacroLoading(true)
    setSelectedDjArticle(null)
    try {
      const { data: result, errors } = await client.queries.getMacroNews({ screen, limit: 50 })
      if (errors) throw new Error(errors[0].message)
      const articles: DowJonesArticle[] = (result ?? []).map((a: any) => ({
        id:            a.id,
        headline:      a.headline    || '',
        publishedDate: a.publishedAt || new Date().toISOString(),
        body:          a.report      || '',
        industry:      '',
        source:        view as DowJonesArticle['source'],
      }))
      setMacroArticles(articles)
    } catch (err) {
      console.error('Error fetching macro news:', err)
      setMacroArticles([])
    } finally {
      setMacroLoading(false)
    }
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
    setSelectedArticle(null)
    setActiveView('db')
    setImportanceFilter('All')
    setCategoryFilter('All')
    clearUnread(tickerValue)

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
    setTicker(companyTicker.split(' ')[0])
    setSearchTicker(companyTicker)
    setShowIndustryDropdown(false)
    // Trigger fetch with the new ticker
    fetchTickerNews(companyTicker)
  }

  const selectFromHistory = (historicalTicker: string) => {
    setTicker(historicalTicker.split(' ')[0])
    setSearchTicker(historicalTicker)
    clearUnread(historicalTicker)
    fetchTickerNews(historicalTicker)
  }

  useEffect(() => {
    if (activeView !== 'db') {
      fetchMacroNews(activeView)
    }
  }, [activeView])

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

  const availableCategories = useMemo(() => {
    if (!data?.newsArticles) return []
    const cats = new Set(
      data.newsArticles.map(a => a.category?.substring(0, 4)).filter((c): c is string => !!c)
    )
    return Array.from(cats).sort()
  }, [data?.newsArticles])

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
      {activeView === 'db' ? (
        <div className="ticker-selector">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const processedTicker = processTicker(ticker)
                setTicker(processedTicker.split(' ')[0])
                setSearchTicker(processedTicker)
                fetchTickerNews(processedTicker)
              }
            }}
            placeholder="Enter ticker (e.g., AAPL)"
          />
          <button onClick={() => {
            const processedTicker = processTicker(ticker)
            setTicker(processedTicker.split(' ')[0])
            setSearchTicker(processedTicker)
            fetchTickerNews(processedTicker)
          }}>Search</button>
          <button className="theme-toggle" onClick={() => setDarkMode(d => !d)} title="Toggle dark mode">
            {darkMode ? '☀' : '☾'}
          </button>
          {searchHistory.length > 0 && searchHistory.map((historyTicker, index) => (
            <span
              key={index}
              className={`history-item ${historyTicker === searchTicker ? 'active' : ''} ${unreadScreens[historyTicker] ? 'unread' : ''}`}
              onClick={() => selectFromHistory(historyTicker)}
            >
              {historyTicker}
              {unreadScreens[historyTicker] && <span className="unread-dot" />}
            </span>
          ))}
        </div>
      ) : (
        <div className="dj-table-header">
          <h2 className="dj-table-title">{activeView}</h2>
          {activeView === 'oil_news' && (
            <div className="dj-dashboard-buttons">
              <button
                className={`oil-btn${showOilDashboard ? ' active' : ''}`}
                onClick={() => setShowOilDashboard(v => !v)}
              >
                Global oil supply risk dashboard
              </button>
              <button
                className={`oil-btn${showEIADashboard ? ' active' : ''}`}
                onClick={() => setShowEIADashboard(v => !v)}
              >
                EIA Weekly Dashboard
              </button>
            </div>
          )}
        </div>
      )}

      <div className="split-container">
        {/* Left Side - News Table */}
        <section className="news-table-section">
          {activeView !== 'db' ? (
            <>
            <div className="news-table-scroll">
            <div className="news-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {macroLoading ? (
                    <tr><td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                  ) : null}
                  {!macroLoading && macroArticles.map((article: DowJonesArticle) => {
                    const isExpanded = selectedDjArticle?.id === article.id && selectedDjArticle?.source === article.source
                    return [
                      <tr
                        key={article.id}
                        className={`article-row${isExpanded ? ' expanded' : ''}`}
                        onClick={() => setSelectedDjArticle(prev =>
                          prev?.id === article.id && prev?.source === article.source ? null : article
                        )}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="date-cell">{formatDate(article.publishedDate)}</td>
                        <td className="headline-cell">
                          <span className="accordion-chevron">{isExpanded ? '▾' : '▸'}</span>
                          {article.headline}
                        </td>
                        <td className="category-cell">{article.source}</td>
                      </tr>,
                      isExpanded && (
                        <tr key={`${article.id}-detail`} className="accordion-detail-row">
                          <td colSpan={3}>
                            <div className="accordion-detail">
                              <div className="accordion-detail-header">
                                <span className="article-summary-meta">
                                  Dow Jones · {formatDate(article.publishedDate)}
                                </span>
                              </div>
                              <div className="accordion-detail-text">
                                {article.body
                                  .replace(/\r\n|\r/g, '\n')
                                  .split('\n')
                                  .map((line, i) => (
                                    <span key={i}>{line || ' '}<br /></span>
                                  ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ),
                    ]
                  })}
                </tbody>
              </table>
            </div>
            </div>
            </>
          ) : data?.newsArticles && data.newsArticles.length > 0 ? (
            <div className="news-table-scroll" ref={tableScrollRef}>
            <div className="news-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>
                      <div className="th-filter">
                        <span>Importance</span>
                        <select
                          value={importanceFilter}
                          onChange={e => setImportanceFilter(e.target.value)}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="All">All</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                    </th>
                    <th>
                      <div className="th-filter">
                        <span>Category</span>
                        <select
                          value={categoryFilter}
                          onChange={e => setCategoryFilter(e.target.value)}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="All">All</option>
                          {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const cutoff = getPrevTradeDateCutoff()
                    let separatorInserted = false
                    const sorted = [...data.newsArticles]
                      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
                      .filter(article => {
                        if (importanceFilter !== 'All') {
                          if (!article.importance) return false
                          const n = Number(article.importance)
                          const label = n <= 3 ? 'High' : n <= 6 ? 'Medium' : 'Low'
                          if (label !== importanceFilter) return false
                        }
                        if (categoryFilter !== 'All') {
                          if ((article.category?.substring(0, 4) || '') !== categoryFilter) return false
                        }
                        return true
                      })
                    return sorted.flatMap((article) => {
                      const rows = []
                      const articleDate = new Date(article.publishedDate)
                      if (!separatorInserted && articleDate < cutoff) {
                        separatorInserted = true
                        rows.push(
                          <tr key="separator" className="trade-date-separator">
                            <td colSpan={4}>
                              <span>Before 4PM {cutoff.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            </td>
                          </tr>
                        )
                      }
                      const isExpanded = selectedArticle?.id === article.id
                      const articleText = article.article || article.summary || ''
                      const charCount = articleText.length
                      const hasDetail = charCount > 0
                      rows.push(
                        <tr
                          key={article.id}
                          className={`article-row${isExpanded ? ' expanded' : ''}`}
                          onClick={() => hasDetail && setSelectedArticle(prev => prev?.id === article.id ? null : article)}
                          style={{ cursor: hasDetail ? 'pointer' : 'default' }}
                        >
                          <td className="date-cell">{formatDate(article.publishedDate)}</td>
                          <td className="headline-cell">
                            {hasDetail && <span className="accordion-chevron">{isExpanded ? '▾' : '▸'}</span>}
                            {article.headline}
                          </td>
                          <td className="importance-cell">
                            {article.importance ? (() => {
                              const n = Number(article.importance)
                              const label = n <= 3 ? 'High' : n <= 6 ? 'Medium' : 'Low'
                              const cls = n <= 3 ? 'importance-high' : n <= 6 ? 'importance-mid' : 'importance-low'
                              return <span className={`importance-badge ${cls}`}>{label}</span>
                            })() : '-'}
                          </td>
                          <td className="category-cell">{article.category ? article.category.substring(0, 4) : '-'}</td>
                        </tr>
                      )
                      if (isExpanded) {
                        rows.push(
                          <tr key={`${article.id}-detail`} className="accordion-detail-row">
                            <td colSpan={4}>
                              <div className="accordion-detail">
                                <div className="accordion-detail-header">
                                  <span className="article-summary-meta">
                                    {article.source} · {formatDate(article.publishedDate)}
                                  </span>
                                  <div className="accordion-detail-buttons">
                                    <button
                                      className="article-summary-link"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const subject = encodeURIComponent(article.headline || 'News Article')
                                        const bodyParts = [`${article.headline}\n\n${article.article || article.summary || ''}`]
                                        if (article.url) bodyParts.push(`Read more: ${article.url}`)
                                        const body = encodeURIComponent(bodyParts.join('\n\n'))
                                        window.location.href = `mailto:?subject=${subject}&body=${body}`
                                      }}
                                    >
                                      Send Email
                                    </button>
                                    {article.url && (
                                      <button
                                        className="article-summary-link"
                                        onClick={(e) => { e.stopPropagation(); openArticle(article.url) }}
                                      >
                                        Full Story
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="accordion-detail-text">
                                  {(article.article || article.summary || '')
                                    .replace(/\r\n|\r/g, '\n')
                                    .split('\n')
                                    .map((line, i) => (
                                      <span key={i}>{line || '\u00A0'}<br /></span>
                                    ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )
                      }
                      return rows
                    })
                  })()}
                </tbody>
              </table>
            </div>
            </div>
          ) : (
            <p className="no-news">No news articles found for this ticker.</p>
          )}

        </section>

        {/* Right Side - Security Panel + Oil Button */}
        <div className="right-column">
        {activeView === 'oil_news' ? <OilPanel /> :
         activeView === 'rates_news' ? <RatesPanel /> :
         activeView === 'fx_news' ? <FxPanel /> :
         activeView === 'inflation_news' ? <InflationPanel /> :
         activeView === 'employment_news' ? <EmploymentPanel /> :
         activeView === 'trade_news' ? <TradePanel /> : null}
        <aside className="security-panel" style={{ display: activeView === 'db' ? undefined : 'none' }}>
          {data?.security ? (
            <>
              <h2>{data.security.companyName}</h2>
              <div className="security-info-grid">
                <div className="info-group">
                  <h4>Trading Info</h4>
                  <div className="detail-item">
                    <strong>Avg Daily Volume:</strong>
                    <span className="detail-item-value">{data.security.avgDailyVolume ? parseInt(data.security.avgDailyVolume).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Short Interest:</strong>
                    <span className="detail-item-value">{data.security.shortInterest ? parseInt(data.security.shortInterest).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Short Ratio:</strong>
                    <span className="detail-item-value">{data.security.shortRatio ? parseFloat(data.security.shortRatio).toFixed(2) : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Earnings Date:</strong>
                    <span className="detail-item-value">{data.security.earningsDate ? formatDateOnly(data.security.earningsDate) : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Ex-Div Date:</strong>
                    <span className="detail-item-value">{data.security.exDivDate ? formatDateOnly(data.security.exDivDate) : 'N/A'}</span>
                  </div>
                  {data.security.exDivAmount && (
                    <div className="detail-item">
                      <strong>Div Amount:</strong>
                      <span className="detail-item-value">${parseFloat(data.security.exDivAmount).toFixed(2)}</span>
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

              </div>
            </>
          ) : (
            <p>No security information available</p>
          )}
        </aside>
        <div className="oil-btn-container">
          {([
            ['oil_news',        'oil',        'oil_news'],
            ['rates_news',      'rates',      'rates_news'],
            ['fx_news',         'fx',         'fx_news'],
            ['inflation_news',  'inflation',  'inflation_news'],
            ['employment_news', 'employment', 'employment_news'],
            ['trade_news',      'trade',      'trade_news'],
          ] as [string, string, string][]).map(([view, key, label]) => (
            <button
              key={view}
              className={`oil-btn${activeView === view ? ' active' : ''}${unreadScreens[key] ? ' unread' : ''}`}
              onClick={() => { clearUnread(key); setActiveView(v => v === view ? 'db' : view as any) }}
            >
              {label}
              {unreadScreens[key] && <span className="unread-dot" />}
            </button>
          ))}
          {activeView !== 'db' && (
            <button
              className="oil-btn"
              onClick={() => setActiveView('db')}
            >
              {searchTicker} News
            </button>
          )}
        </div>
        </div>
      </div>

      {showOilDashboard && (
        <div className="oil-modal-backdrop" onClick={() => setShowOilDashboard(false)}>
          <div className="oil-modal" onClick={e => e.stopPropagation()}>
            <button className="oil-modal-close" onClick={() => setShowOilDashboard(false)}>✕</button>
            <GeopoliticalRiskDashboard />
          </div>
        </div>
      )}
      {showEIADashboard && (
        <div className="oil-modal-backdrop" onClick={() => setShowEIADashboard(false)}>
          <div className="oil-modal" onClick={e => e.stopPropagation()}>
            <button className="oil-modal-close" onClick={() => setShowEIADashboard(false)}>✕</button>
            <EIADashboard />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
