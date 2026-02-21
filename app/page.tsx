'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { callAIAgent, extractText } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { FiSend, FiBarChart2, FiShield, FiSearch, FiX, FiClock, FiActivity, FiTarget, FiLayers } from 'react-icons/fi'
import { BsGraphUp } from 'react-icons/bs'
import { AiOutlineStock } from 'react-icons/ai'
import { MdOutlineAnalytics, MdOutlineDashboard } from 'react-icons/md'
import { HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineTrendingDown } from 'react-icons/hi'
import { IoSparkles } from 'react-icons/io5'
import { BiAnalyse } from 'react-icons/bi'
import { RiStockLine, RiStockFill } from 'react-icons/ri'

// ── Constants ──────────────────────────────────────────────────────────────────

const MANAGER_AGENT_ID = '699961350ab3a50ca24854a8'

const ACCENT_COLOR = 'hsl(160, 70%, 40%)'
const ACCENT_COLOR_LIGHT = 'hsl(160, 70%, 50%)'
const ACCENT_BG_SUBTLE = 'hsl(160, 70%, 40%, 0.12)'
const ACCENT_BG_MEDIUM = 'hsl(160, 70%, 40%, 0.2)'

const AGENTS_INFO = [
  { id: MANAGER_AGENT_ID, name: 'Indian Stock Advisor Manager', role: 'Coordinator' },
  { id: '69996128730bbd74d53e89c9', name: 'Volatility Research Agent', role: 'Volatility Analysis' },
  { id: '69996128a63b170a3b8170e0', name: 'Analyst Ratings Agent', role: 'Ratings Research' },
]

const SECTORS = ['All', 'Banking', 'IT Services', 'FMCG', 'Telecom', 'Conglomerate', 'Consumer Goods'] as const

const QUICK_QUERIES = [
  { label: 'Nifty 50 Reliable Picks', query: 'What are the most reliable Nifty 50 stocks for long-term investment?' },
  { label: 'Low Risk Banking', query: 'Recommend low volatility banking stocks on NSE for conservative investors' },
  { label: 'IT Sector Leaders', query: 'Which IT sector stocks on NSE have the best analyst ratings and low volatility?' },
  { label: 'High Dividend Stocks', query: 'Best high dividend yield stocks on NSE/BSE with low volatility' },
  { label: 'Defensive FMCG Plays', query: 'Recommend defensive FMCG stocks on Indian exchanges for safe investment' },
]

// ── Ticker Tape Data ───────────────────────────────────────────────────────────

const TICKER_DATA = [
  { symbol: 'NIFTY50', value: '24,857.30', change: '+1.2%', up: true },
  { symbol: 'SENSEX', value: '81,523.16', change: '+0.9%', up: true },
  { symbol: 'RELIANCE', value: '2,947.50', change: '+0.8%', up: true },
  { symbol: 'TCS', value: '4,123.80', change: '-0.3%', up: false },
  { symbol: 'HDFCBANK', value: '1,789.25', change: '+1.5%', up: true },
  { symbol: 'INFY', value: '1,892.40', change: '+0.6%', up: true },
  { symbol: 'HINDUNILVR', value: '2,456.70', change: '-0.2%', up: false },
  { symbol: 'ITC', value: '468.35', change: '+2.1%', up: true },
  { symbol: 'BHARTIARTL', value: '1,678.90', change: '+1.8%', up: true },
  { symbol: 'SBIN', value: '845.60', change: '+0.4%', up: true },
]

// ── Top 10 Stocks ──────────────────────────────────────────────────────────────

interface TopStock {
  rank: number
  ticker: string
  name: string
  sector: string
  volatility: 'Low' | 'Medium'
  rating: 'Buy' | 'Hold' | 'Strong Buy'
  rationale: string
}

const TOP_10_STOCKS: TopStock[] = [
  { rank: 1, ticker: 'RELIANCE', name: 'Reliance Industries', sector: 'Conglomerate', volatility: 'Low', rating: 'Strong Buy', rationale: 'Market leader in petrochemicals, telecom (Jio), and retail with diversified revenue streams' },
  { rank: 2, ticker: 'TCS', name: 'Tata Consultancy Services', sector: 'IT Services', volatility: 'Low', rating: 'Buy', rationale: 'Largest IT services company with consistent earnings growth and strong dividend history' },
  { rank: 3, ticker: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', volatility: 'Low', rating: 'Strong Buy', rationale: 'India\'s largest private bank with strong asset quality and steady credit growth' },
  { rank: 4, ticker: 'INFY', name: 'Infosys', sector: 'IT Services', volatility: 'Low', rating: 'Buy', rationale: 'Second largest IT services firm with strong digital transformation pipeline' },
  { rank: 5, ticker: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG', volatility: 'Low', rating: 'Hold', rationale: 'India\'s leading FMCG company with strong brand portfolio and rural distribution reach' },
  { rank: 6, ticker: 'ITC', name: 'ITC Limited', sector: 'FMCG', volatility: 'Low', rating: 'Buy', rationale: 'Diversified conglomerate with high dividend yield and growing FMCG segment' },
  { rank: 7, ticker: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', volatility: 'Medium', rating: 'Buy', rationale: 'Leading telecom operator with strong subscriber base and 5G rollout momentum' },
  { rank: 8, ticker: 'SBIN', name: 'State Bank of India', sector: 'Banking', volatility: 'Medium', rating: 'Buy', rationale: 'India\'s largest public sector bank with improving asset quality and digital adoption' },
  { rank: 9, ticker: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking', volatility: 'Low', rating: 'Buy', rationale: 'Premium private bank with strong capital adequacy and conservative lending practices' },
  { rank: 10, ticker: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer Goods', volatility: 'Low', rating: 'Hold', rationale: 'Market leader in decorative paints with strong brand moat and pricing power' },
]

// ── Types ──────────────────────────────────────────────────────────────────────

interface StockRecommendation {
  ticker: string
  name: string
  volatility: string
  rating: string
  rationale: string
}

interface AnalysisPanel {
  isOpen: boolean
  isLoading: boolean
  stockTicker: string | null
  stockName: string | null
  content: string | null
  stocks: StockRecommendation[]
}

// ── Stock Parsing ──────────────────────────────────────────────────────────────

function parseStockRecommendations(text: string): StockRecommendation[] {
  const stocks: StockRecommendation[] = []
  if (!text) return stocks

  const sections = text.split(/(?=\d+\.\s+\*\*[A-Z])|(?=\*\*[A-Z]{2,12}\s)|(?=###\s)/g)

  for (const section of sections) {
    const tickerMatch = section.match(/\*\*([A-Z]{2,12})\*\*|\b([A-Z]{2,12})\b\s*[-:(\[]/)
    if (!tickerMatch) continue

    const ticker = tickerMatch[1] || tickerMatch[2]
    if (!ticker) continue

    const commonWords = ['THE', 'AND', 'FOR', 'NOT', 'BUT', 'ARE', 'WAS', 'HAS', 'HAD', 'HIS', 'HER', 'ITS', 'ALSO', 'BEEN', 'CAN', 'DID', 'GET', 'LET', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'BOY', 'ALL', 'ANY', 'HOW', 'MAN', 'OUR', 'OUT', 'DAY', 'USE', 'TWO', 'SET', 'LOW', 'HIGH', 'BASED', 'STOCK', 'LONG', 'TERM', 'RISK', 'BOTH', 'SAFE', 'WITH', 'FROM', 'THAT', 'THIS', 'WILL', 'THEY', 'HAVE', 'EACH', 'MAKE', 'LIKE', 'JUST', 'OVER', 'SUCH', 'TAKE', 'YEAR', 'THEM', 'SOME', 'THAN', 'VERY', 'WHEN', 'WHAT', 'YOUR', 'SAID', 'GOOD', 'NSE', 'BSE', 'NIFTY', 'INDIA', 'SENSEX', 'SECTOR', 'MARKET']
    if (commonWords.includes(ticker)) continue

    const nameMatch = section.match(new RegExp(`\\*\\*${ticker}\\*\\*\\s*[-:\\(]\\s*([^\\n\\)]+)`)) ||
      section.match(new RegExp(`${ticker}\\s*[-:\\(]\\s*([^\\n\\)]+)`))
    const name = nameMatch ? nameMatch[1].replace(/\*\*/g, '').replace(/\).*/, '').trim().substring(0, 60) : ticker

    let volatility = 'Medium'
    const volLow = /low\s*volatility|volatility[:\s]*low|stable|minimal\s*risk/i.test(section)
    const volHigh = /high\s*volatility|volatility[:\s]*high|volatile/i.test(section)
    if (volLow) volatility = 'Low'
    else if (volHigh) volatility = 'High'

    let rating = 'Hold'
    const ratingBuy = /\bbuy\b|strong\s*buy|outperform|overweight|positive/i.test(section)
    const ratingSell = /\bsell\b|strong\s*sell|underperform|underweight|negative/i.test(section)
    if (ratingBuy) rating = 'Buy'
    else if (ratingSell) rating = 'Sell'

    const rationaleMatch = section.match(/(?:rationale|reason|note|summary|analysis)[:\s]*([^\n]+)/i) ||
      section.match(/(?:[-*]\s*)([^*\n]{20,120})/)
    const rationale = rationaleMatch ? rationaleMatch[1].replace(/\*\*/g, '').trim() : ''

    if (!stocks.find(s => s.ticker === ticker)) {
      stocks.push({ ticker, name, volatility, rating, rationale })
    }
  }

  if (stocks.length === 0) {
    const globalTickerPattern = /\*\*([A-Z]{2,12})\*\*/g
    let match
    const seen = new Set<string>()
    const skipWords = ['THE', 'AND', 'FOR', 'NOT', 'BUT', 'ARE', 'WAS', 'HAS', 'HAD', 'NSE', 'BSE', 'NIFTY', 'SENSEX', 'INDIA']

    while ((match = globalTickerPattern.exec(text)) !== null) {
      const t = match[1]
      if (seen.has(t) || skipWords.includes(t)) continue
      seen.add(t)
      stocks.push({ ticker: t, name: t, volatility: 'Medium', rating: 'Hold', rationale: '' })
    }
  }

  return stocks.slice(0, 15)
}

// ── Markdown Renderer ──────────────────────────────────────────────────────────

function formatInline(text: string): React.ReactNode {
  if (!text) return null
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1" style={{ color: ACCENT_COLOR_LIGHT }}>
              {formatInline(line.slice(4))}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1" style={{ color: ACCENT_COLOR_LIGHT }}>
              {formatInline(line.slice(3))}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2" style={{ color: ACCENT_COLOR_LIGHT }}>
              {formatInline(line.slice(2))}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm text-foreground/90">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm text-foreground/90">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (line.startsWith('---') || line.startsWith('***'))
          return <Separator key={i} className="my-2 opacity-30" />
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm text-foreground/90 leading-relaxed">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ── Analysis Stock Card ────────────────────────────────────────────────────────

function AnalysisStockCard({ stock }: { stock: StockRecommendation }) {
  const volColor = stock.volatility === 'Low'
    ? '#22c55e'
    : stock.volatility === 'High'
      ? '#ef4444'
      : '#eab308'

  const ratingColor = stock.rating === 'Buy' || stock.rating === 'Strong Buy'
    ? '#22c55e'
    : stock.rating === 'Sell'
      ? '#ef4444'
      : '#eab308'

  const ratingBg = stock.rating === 'Buy' || stock.rating === 'Strong Buy'
    ? 'rgba(34,197,94,0.15)'
    : stock.rating === 'Sell'
      ? 'rgba(239,68,68,0.15)'
      : 'rgba(234,179,8,0.15)'

  return (
    <div className="rounded-lg border border-border bg-background/50 p-3 hover:border-border/80 transition-all duration-200">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold font-mono tracking-wide" style={{ backgroundColor: ACCENT_BG_MEDIUM, color: ACCENT_COLOR_LIGHT }}>
          {stock.ticker}
        </span>
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: ratingBg, color: ratingColor }}>
          {stock.rating}
        </span>
      </div>
      {stock.name !== stock.ticker && (
        <p className="text-xs text-muted-foreground truncate mb-1">{stock.name}</p>
      )}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: volColor }} />
        <span className="text-[11px] text-muted-foreground">{stock.volatility} Vol</span>
      </div>
      {stock.rationale && (
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed line-clamp-2">{stock.rationale}</p>
      )}
    </div>
  )
}

// ── ErrorBoundary ──────────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Page() {
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substring(2, 15))
  const [sessionId] = useState(() => 'session_' + Date.now().toString(36))

  const [selectedSector, setSelectedSector] = useState<string>('All')
  const [analysisPanel, setAnalysisPanel] = useState<AnalysisPanel>({
    isOpen: false,
    isLoading: false,
    stockTicker: null,
    stockName: null,
    content: null,
    stocks: [],
  })
  const [inputValue, setInputValue] = useState('')
  const [queryHistory, setQueryHistory] = useState<Array<{ query: string; timestamp: string }>>([])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false)
  const [sampleDataOn, setSampleDataOn] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [marketOpen, setMarketOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const analysisPanelRef = useRef<HTMLDivElement>(null)

  // Clock and market status
  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const istOffset = 5.5 * 60 * 60 * 1000
      const istDate = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60000)
      const hours = istDate.getHours()
      const mins = istDate.getMinutes()
      const timeStr = istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      setCurrentTime(timeStr + ' IST')
      const totalMins = hours * 60 + mins
      setMarketOpen(totalMins >= 555 && totalMins <= 930) // 9:15 - 15:30
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  // Sample data for analysis panel
  useEffect(() => {
    if (sampleDataOn && !analysisPanel.isOpen) {
      setAnalysisPanel({
        isOpen: true,
        isLoading: false,
        stockTicker: 'RELIANCE',
        stockName: 'Reliance Industries',
        content: '## Investment Analysis: RELIANCE\n\n### Verdict: INVEST\n\nBased on comprehensive analysis from both volatility research and analyst ratings:\n\n### Volatility Assessment\n- **30-Day Volatility**: Low (annualized ~22%)\n- **Beta**: 0.85 (less volatile than market)\n- **Max Drawdown (1Y)**: -12.3%\n- **Sharpe Ratio**: 1.4\n\n### Analyst Consensus\n- **Rating**: Strong Buy\n- **Target Price**: INR 3,250 (upside ~10%)\n- **Coverage**: 38 analysts\n- **Buy/Hold/Sell**: 28/8/2\n\n### Key Strengths\n- Diversified revenue across petrochemicals, telecom (Jio), and retail\n- Strong free cash flow generation\n- Market leader position in multiple segments\n- Consistent dividend track record\n\n### Risks\n- Oil price sensitivity in refining segment\n- Regulatory risks in telecom\n- High capital expenditure requirements\n\n---\n\n**Recommendation**: Suitable for long-term conservative portfolios. Current valuation offers reasonable entry point.',
        stocks: [
          { ticker: 'RELIANCE', name: 'Reliance Industries', volatility: 'Low', rating: 'Strong Buy', rationale: 'Market leader with diversified revenue streams' },
          { ticker: 'TCS', name: 'Tata Consultancy Services', volatility: 'Low', rating: 'Buy', rationale: 'Consistent earnings with strong IT demand' },
          { ticker: 'HDFCBANK', name: 'HDFC Bank', volatility: 'Low', rating: 'Strong Buy', rationale: 'Best-in-class asset quality among Indian banks' },
        ],
      })
    }
    if (!sampleDataOn && analysisPanel.isOpen && analysisPanel.stockTicker === 'RELIANCE' && analysisPanel.content?.includes('Verdict: INVEST')) {
      setAnalysisPanel({
        isOpen: false,
        isLoading: false,
        stockTicker: null,
        stockName: null,
        content: null,
        stocks: [],
      })
    }
  }, [sampleDataOn])

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    if (selectedSector === 'All') return TOP_10_STOCKS
    return TOP_10_STOCKS.filter(s => s.sector.includes(selectedSector))
  }, [selectedSector])

  // Summary metrics
  const metrics = useMemo(() => {
    const buyRated = TOP_10_STOCKS.filter(s => s.rating === 'Buy' || s.rating === 'Strong Buy').length
    const lowVol = TOP_10_STOCKS.filter(s => s.volatility === 'Low').length
    const sectors = new Set(TOP_10_STOCKS.map(s => s.sector)).size
    return { total: TOP_10_STOCKS.length, buyRated, lowVol, sectors }
  }, [])

  // Run analysis
  const runAnalysis = useCallback(async (query: string, ticker?: string, name?: string) => {
    const trimmed = query.trim()
    if (!trimmed) return

    setInputValue('')
    setAnalysisPanel({
      isOpen: true,
      isLoading: true,
      stockTicker: ticker ?? null,
      stockName: name ?? null,
      content: null,
      stocks: [],
    })
    setActiveAgentId(MANAGER_AGENT_ID)
    setQueryHistory(prev => [{ query: trimmed, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 10))

    try {
      const result = await callAIAgent(trimmed, MANAGER_AGENT_ID, {
        user_id: userId,
        session_id: sessionId,
      })

      let responseText = ''
      let stocks: StockRecommendation[] = []

      if (result.success) {
        responseText = extractText(result.response)
        if (!responseText && result?.response?.result?.response) {
          responseText = result.response.result.response
        }
        if (!responseText) {
          responseText = 'Analysis complete. No detailed text was returned.'
        }
        stocks = parseStockRecommendations(responseText)
      } else {
        responseText = result?.error ?? 'An error occurred while analyzing. Please try again.'
      }

      setAnalysisPanel({
        isOpen: true,
        isLoading: false,
        stockTicker: ticker ?? (stocks.length > 0 ? stocks[0].ticker : null),
        stockName: name ?? (stocks.length > 0 ? stocks[0].name : null),
        content: responseText,
        stocks,
      })
    } catch {
      setAnalysisPanel({
        isOpen: true,
        isLoading: false,
        stockTicker: ticker ?? null,
        stockName: name ?? null,
        content: 'A network error occurred. Please check your connection and try again.',
        stocks: [],
      })
    } finally {
      setActiveAgentId(null)
    }
  }, [userId, sessionId])

  const handleAnalyzeStock = useCallback((stock: TopStock) => {
    runAnalysis(
      `Give me a detailed reliability analysis of ${stock.ticker} (${stock.name}) stock on NSE including volatility metrics, analyst ratings, and investment verdict`,
      stock.ticker,
      stock.name
    )
  }, [runAnalysis])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      runAnalysis(inputValue)
    }
  }, [inputValue, runAnalysis])

  const closePanel = useCallback(() => {
    setAnalysisPanel(prev => ({ ...prev, isOpen: false }))
  }, [])

  // Detect verdict from content
  const verdictType = useMemo(() => {
    const content = analysisPanel.content ?? ''
    if (/invest|strong\s*buy|recommended|bullish/i.test(content)) return 'invest'
    if (/avoid|sell|bearish|not\s*recommended/i.test(content)) return 'avoid'
    return 'neutral'
  }, [analysisPanel.content])

  return (
    <ErrorBoundary>
      <div className="min-h-screen h-screen flex flex-col bg-background text-foreground overflow-hidden">
        {/* ── TICKER ANIMATION STYLE ───────────────────────────────────── */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes tickerScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker-animate {
            animation: tickerScroll 30s linear infinite;
          }
          .ticker-animate:hover {
            animation-play-state: paused;
          }
        `}} />

        {/* ── TOP BAR ──────────────────────────────────────────────────── */}
        <header className="flex-shrink-0 border-b border-border bg-card/60 backdrop-blur-sm z-30">
          {/* Upper row: Logo + Status */}
          <div className="flex items-center justify-between px-4 h-12">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileLeftOpen(true)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                aria-label="Open menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: ACCENT_BG_MEDIUM }}>
                  <RiStockFill className="w-4 h-4" style={{ color: ACCENT_COLOR_LIGHT }} />
                </div>
                <span className="font-semibold text-sm text-foreground tracking-tight">StockAdvisor</span>
                <Badge variant="outline" className="text-[10px] border-border px-1.5 py-0 h-5 font-mono">NSE | BSE</Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Agent status dots */}
              <TooltipProvider>
                <div className="hidden md:flex items-center gap-2">
                  {AGENTS_INFO.map((agent) => {
                    const isActive = activeAgentId === agent.id
                    return (
                      <Tooltip key={agent.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 cursor-default">
                            <span className={cn('w-2 h-2 rounded-full transition-colors', isActive ? 'animate-pulse' : '')} style={{ backgroundColor: isActive ? '#22c55e' : 'hsl(160, 15%, 25%)' }} />
                            <span className="text-[11px] text-muted-foreground hidden lg:inline">{agent.role}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-popover text-popover-foreground border-border">
                          <p className="text-xs">{agent.name}</p>
                          <p className="text-[10px] text-muted-foreground">{isActive ? 'Processing...' : 'Idle'}</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </TooltipProvider>

              {/* Clock */}
              <div className="flex items-center gap-1.5">
                <FiClock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-mono text-muted-foreground">{currentTime}</span>
              </div>
            </div>
          </div>

          {/* Ticker tape */}
          <div className="border-t border-border/50 overflow-hidden h-8 flex items-center bg-background/40">
            <div className="ticker-animate flex whitespace-nowrap">
              {[...TICKER_DATA, ...TICKER_DATA].map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-1.5 px-4 border-r border-border/30">
                  <span className="text-[11px] font-mono font-semibold text-foreground/80">{item.symbol}</span>
                  <span className="text-[11px] font-mono text-foreground/60">{item.value}</span>
                  <span className={cn('text-[11px] font-mono font-medium flex items-center gap-0.5', item.up ? 'text-[#22c55e]' : 'text-[#ef4444]')}>
                    {item.up ? <HiOutlineTrendingUp className="w-3 h-3" /> : <HiOutlineTrendingDown className="w-3 h-3" />}
                    {item.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ── MAIN BODY (3-column) ────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Mobile overlay for left panel */}
          {mobileLeftOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileLeftOpen(false)} />
          )}

          {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
          <aside className={cn(
            'fixed lg:relative z-50 lg:z-auto h-full w-[240px] flex-shrink-0 flex flex-col border-r border-border bg-card/80 backdrop-blur-sm transition-transform duration-300 ease-in-out',
            mobileLeftOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-5">
                {/* Mobile close */}
                <div className="flex items-center justify-between lg:hidden">
                  <span className="text-xs font-semibold text-foreground">Menu</span>
                  <button onClick={() => setMobileLeftOpen(false)} className="p-1 rounded-md hover:bg-secondary/50">
                    <FiX className="w-4 h-4" />
                  </button>
                </div>

                {/* Sector Filters */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <FiLayers className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Sectors</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SECTORS.map(sector => (
                      <button
                        key={sector}
                        onClick={() => { setSelectedSector(sector); setMobileLeftOpen(false) }}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 border',
                          selectedSector === sector
                            ? 'border-transparent text-white'
                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        )}
                        style={selectedSector === sector ? { backgroundColor: ACCENT_COLOR } : undefined}
                      >
                        {sector}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className="opacity-20" />

                {/* Quick Analysis Chips */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <IoSparkles className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Quick Analysis</span>
                  </div>
                  <div className="space-y-1.5">
                    {QUICK_QUERIES.map(q => (
                      <button
                        key={q.label}
                        onClick={() => { runAnalysis(q.query); setMobileLeftOpen(false) }}
                        disabled={analysisPanel.isLoading}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 leading-snug disabled:opacity-40"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className="opacity-20" />

                {/* Agent Status Panel */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <MdOutlineAnalytics className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Agents</span>
                  </div>
                  <div className="space-y-2">
                    {AGENTS_INFO.map(agent => {
                      const isActive = activeAgentId === agent.id
                      return (
                        <div key={agent.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/30">
                          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', isActive ? 'animate-pulse' : '')} style={{ backgroundColor: isActive ? '#22c55e' : 'hsl(160, 15%, 25%)' }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-foreground truncate">{agent.role}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{agent.name}</p>
                          </div>
                          <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-medium', isActive ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-secondary text-muted-foreground')}>
                            {isActive ? 'ACTIVE' : 'IDLE'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Separator className="opacity-20" />

                {/* Market Info */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <FiActivity className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Market</span>
                  </div>
                  <div className="px-2 py-2 rounded-md bg-background/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Status</span>
                      <span className={cn('text-[11px] font-semibold flex items-center gap-1', marketOpen ? 'text-[#22c55e]' : 'text-[#ef4444]')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', marketOpen ? 'bg-[#22c55e] animate-pulse' : 'bg-[#ef4444]')} />
                        {marketOpen ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Hours</span>
                      <span className="text-[11px] font-mono text-foreground/70">9:15 - 15:30 IST</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Exchange</span>
                      <span className="text-[11px] font-mono text-foreground/70">NSE / BSE</span>
                    </div>
                  </div>
                </div>

                <Separator className="opacity-20" />

                {/* Recent Queries */}
                {(Array.isArray(queryHistory) && queryHistory.length > 0) && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <FiClock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Recent</span>
                    </div>
                    <div className="space-y-1">
                      {queryHistory.slice(0, 5).map((entry, idx) => (
                        <button
                          key={idx}
                          onClick={() => runAnalysis(entry.query)}
                          className="w-full text-left px-2 py-1.5 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all truncate"
                        >
                          {entry.query}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample Data Toggle */}
                <div className="px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Sample Data</span>
                    <button
                      onClick={() => setSampleDataOn(prev => !prev)}
                      className={cn('relative w-9 h-5 rounded-full transition-colors duration-200', sampleDataOn ? 'bg-[hsl(160,70%,40%)]' : 'bg-muted')}
                      role="switch"
                      aria-checked={sampleDataOn}
                    >
                      <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200', sampleDataOn ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </aside>

          {/* ── CENTER CONTENT ─────────────────────────────────────────── */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-4 lg:p-6 max-w-[960px] mx-auto">
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="rounded-xl border border-border bg-card/60 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ACCENT_BG_SUBTLE }}>
                      <MdOutlineDashboard className="w-5 h-5" style={{ color: ACCENT_COLOR }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold font-mono text-foreground">{metrics.total}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Stocks</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#22c55e]/10">
                      <BsGraphUp className="w-4 h-4 text-[#22c55e]" />
                    </div>
                    <div>
                      <p className="text-lg font-bold font-mono text-[#22c55e]">{metrics.buyRated}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Buy Rated</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/10">
                      <FiShield className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold font-mono text-blue-400">{metrics.lowVol}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Low Volatility</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-500/10">
                      <FiTarget className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold font-mono text-purple-400">{metrics.sectors}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sectors</p>
                    </div>
                  </div>
                </div>

                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <HiOutlineChartBar className="w-5 h-5" style={{ color: ACCENT_COLOR }} />
                    <h2 className="text-sm font-semibold text-foreground">
                      Top 10 Reliable Indian Stocks
                      {selectedSector !== 'All' && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">/ {selectedSector}</span>
                      )}
                    </h2>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{filteredStocks.length} stocks</span>
                </div>

                {/* ── Stock Table ──────────────────────────────────────── */}
                <div className="rounded-xl border border-border overflow-hidden bg-card/30">
                  {/* Table Header */}
                  <div className="grid grid-cols-[36px_1fr_100px_80px_80px_80px] md:grid-cols-[36px_80px_1fr_100px_80px_80px_80px] gap-0 px-4 py-2.5 bg-card/60 border-b border-border sticky top-0 z-10">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">#</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:block">Symbol</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Company</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Sector</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Volatility</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rating</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Action</span>
                  </div>

                  {/* Table Rows */}
                  {filteredStocks.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No stocks found in this sector. Try selecting "All".
                    </div>
                  ) : (
                    filteredStocks.map((stock, idx) => {
                      const volColor = stock.volatility === 'Low' ? '#22c55e' : '#eab308'
                      const ratingColor = stock.rating === 'Buy' || stock.rating === 'Strong Buy' ? '#22c55e' : '#eab308'
                      const ratingBg = stock.rating === 'Buy' || stock.rating === 'Strong Buy' ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)'
                      const isEven = idx % 2 === 0

                      return (
                        <div
                          key={stock.ticker}
                          className={cn(
                            'grid grid-cols-[36px_1fr_100px_80px_80px_80px] md:grid-cols-[36px_80px_1fr_100px_80px_80px_80px] gap-0 px-4 py-3 items-center transition-all duration-150 hover:bg-secondary/40 cursor-pointer group border-b border-border/30 last:border-0',
                            isEven ? 'bg-transparent' : 'bg-card/20'
                          )}
                          onClick={() => handleAnalyzeStock(stock)}
                        >
                          {/* Rank */}
                          <span className="text-xs font-bold font-mono text-muted-foreground">{stock.rank}</span>

                          {/* Symbol (desktop) */}
                          <div className="hidden md:block">
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold font-mono tracking-wide" style={{ backgroundColor: ACCENT_BG_MEDIUM, color: ACCENT_COLOR_LIGHT }}>
                              {stock.ticker}
                            </span>
                          </div>

                          {/* Company */}
                          <div className="min-w-0 pr-2">
                            {/* Mobile: show ticker + name */}
                            <div className="md:hidden flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-bold font-mono" style={{ color: ACCENT_COLOR_LIGHT }}>{stock.ticker}</span>
                            </div>
                            <p className="text-sm text-foreground truncate font-medium">{stock.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate md:hidden">{stock.sector}</p>
                          </div>

                          {/* Sector */}
                          <div className="hidden sm:block">
                            <Badge variant="outline" className="text-[10px] border-border/60 px-1.5 py-0 h-5 font-normal text-muted-foreground">
                              {stock.sector}
                            </Badge>
                          </div>

                          {/* Volatility */}
                          <div className="hidden sm:flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: volColor }} />
                            <span className="text-[11px] text-muted-foreground">{stock.volatility}</span>
                          </div>

                          {/* Rating */}
                          <div>
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ backgroundColor: ratingBg, color: ratingColor }}>
                              {stock.rating}
                            </span>
                          </div>

                          {/* Action */}
                          <div className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2.5 text-[11px] font-medium opacity-60 group-hover:opacity-100 transition-opacity"
                              style={{ color: ACCENT_COLOR_LIGHT }}
                              onClick={(e) => { e.stopPropagation(); handleAnalyzeStock(stock) }}
                              disabled={analysisPanel.isLoading}
                            >
                              <BiAnalyse className="w-3.5 h-3.5 mr-1" />
                              Analyze
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Disclaimer */}
                <div className="mt-4 px-4 py-3 rounded-xl border border-border bg-card/30">
                  <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                    <FiShield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: ACCENT_COLOR }} />
                    <span>
                      AI-generated research for informational purposes only. Not financial advice. Always consult a qualified financial advisor. Stock data from publicly available NSE/BSE information.
                    </span>
                  </p>
                </div>
              </div>
            </ScrollArea>

            {/* ── BOTTOM COMMAND BAR ───────────────────────────────────── */}
            <div className="flex-shrink-0 border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3">
              <div className="max-w-[960px] mx-auto flex items-center gap-3">
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search stocks or ask for analysis... (e.g., 'Compare HDFCBANK vs ICICIBANK')"
                    disabled={analysisPanel.isLoading}
                    className="w-full h-11 rounded-xl border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[hsl(160,70%,40%)] focus:border-transparent disabled:opacity-50 transition-all duration-200"
                  />
                </div>
                <Button
                  onClick={() => runAnalysis(inputValue)}
                  disabled={!inputValue.trim() || analysisPanel.isLoading}
                  className="h-11 px-5 rounded-xl font-medium text-sm gap-2 transition-all duration-200"
                  style={{
                    backgroundColor: !inputValue.trim() || analysisPanel.isLoading ? 'hsl(160, 22%, 15%)' : ACCENT_COLOR,
                    color: !inputValue.trim() || analysisPanel.isLoading ? 'hsl(160, 15%, 40%)' : 'hsl(160, 20%, 98%)',
                  }}
                >
                  {analysisPanel.isLoading ? (
                    <BiAnalyse className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiSend className="w-4 h-4" />
                  )}
                  Analyze
                </Button>
              </div>
            </div>
          </main>

          {/* ── RIGHT PANEL (Analysis Results) ─────────────────────────── */}
          {/* Overlay for mobile when panel is open */}
          {analysisPanel.isOpen && (
            <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={closePanel} />
          )}

          <aside
            ref={analysisPanelRef}
            className={cn(
              'fixed lg:relative right-0 top-0 lg:top-auto h-full z-50 lg:z-auto w-[380px] md:w-[420px] flex-shrink-0 flex flex-col border-l border-border bg-card/95 backdrop-blur-md transition-transform duration-300 ease-in-out',
              analysisPanel.isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-full'
            )}
            style={analysisPanel.isOpen ? {} : { display: 'none' }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {analysisPanel.isLoading ? (
                  <BiAnalyse className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: ACCENT_COLOR }} />
                ) : (
                  <AiOutlineStock className="w-5 h-5 flex-shrink-0" style={{ color: ACCENT_COLOR }} />
                )}
                <div className="min-w-0">
                  {analysisPanel.stockTicker ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono" style={{ color: ACCENT_COLOR_LIGHT }}>{analysisPanel.stockTicker}</span>
                        {analysisPanel.isLoading && <span className="text-[10px] text-muted-foreground animate-pulse">Analyzing...</span>}
                      </div>
                      {analysisPanel.stockName && (
                        <p className="text-[11px] text-muted-foreground truncate">{analysisPanel.stockName}</p>
                      )}
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{analysisPanel.isLoading ? 'Analyzing...' : 'Analysis Results'}</span>
                  )}
                </div>
              </div>
              <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors flex-shrink-0">
                <FiX className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Panel Body */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                {analysisPanel.isLoading ? (
                  /* Loading skeleton */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <IoSparkles className="w-4 h-4 animate-pulse" style={{ color: ACCENT_COLOR }} />
                      <span className="text-xs text-muted-foreground">Running multi-agent analysis...</span>
                    </div>
                    <Skeleton className="h-10 w-32 rounded-lg bg-muted" />
                    <Skeleton className="h-4 w-full bg-muted" />
                    <Skeleton className="h-4 w-5/6 bg-muted" />
                    <Skeleton className="h-4 w-4/6 bg-muted" />
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      <Skeleton className="h-24 rounded-lg bg-muted" />
                      <Skeleton className="h-24 rounded-lg bg-muted" />
                    </div>
                    <Skeleton className="h-4 w-full bg-muted" />
                    <Skeleton className="h-4 w-3/4 bg-muted" />
                    <Skeleton className="h-4 w-5/6 bg-muted" />
                    <Skeleton className="h-4 w-2/3 bg-muted" />
                  </div>
                ) : analysisPanel.content ? (
                  <div className="space-y-4">
                    {/* Verdict Badge */}
                    <div className="flex items-center gap-2">
                      {verdictType === 'invest' && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30">
                          <HiOutlineTrendingUp className="w-5 h-5 text-[#22c55e]" />
                          <span className="text-sm font-bold text-[#22c55e] uppercase tracking-wider">Invest</span>
                        </div>
                      )}
                      {verdictType === 'avoid' && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30">
                          <HiOutlineTrendingDown className="w-5 h-5 text-[#ef4444]" />
                          <span className="text-sm font-bold text-[#ef4444] uppercase tracking-wider">Avoid</span>
                        </div>
                      )}
                      {verdictType === 'neutral' && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#eab308]/15 border border-[#eab308]/30">
                          <FiBarChart2 className="w-5 h-5 text-[#eab308]" />
                          <span className="text-sm font-bold text-[#eab308] uppercase tracking-wider">Hold / Review</span>
                        </div>
                      )}
                    </div>

                    {/* Stock Recommendation Cards */}
                    {Array.isArray(analysisPanel.stocks) && analysisPanel.stocks.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <RiStockLine className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mentioned Stocks</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {analysisPanel.stocks.map(stock => (
                            <AnalysisStockCard key={stock.ticker} stock={stock} />
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator className="opacity-20" />

                    {/* Full Analysis */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <MdOutlineAnalytics className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Full Analysis</span>
                      </div>
                      <div className="rounded-lg border border-border bg-background/30 p-3">
                        {renderMarkdown(analysisPanel.content)}
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="mt-4 pt-3 border-t border-border/30">
                      <p className="text-[10px] text-muted-foreground/60 leading-relaxed flex items-start gap-1.5">
                        <FiShield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>This is AI-generated research for informational purposes only. Not financial advice. Consult a qualified advisor before making investment decisions.</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: ACCENT_BG_SUBTLE }}>
                      <FiBarChart2 className="w-7 h-7" style={{ color: ACCENT_COLOR }} />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">Select a stock to analyze</p>
                    <p className="text-xs text-muted-foreground max-w-[200px]">Click "Analyze" on any stock or use the command bar below</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </div>
    </ErrorBoundary>
  )
}
