'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent, extractText } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { FiSend, FiPlus, FiMessageSquare, FiTrendingUp, FiBarChart2, FiShield } from 'react-icons/fi'
import { BsGraphUp } from 'react-icons/bs'
import { AiOutlineStock } from 'react-icons/ai'
import { MdOutlineAnalytics } from 'react-icons/md'
import { HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineTrendingDown } from 'react-icons/hi'
import { IoSparkles } from 'react-icons/io5'
import { BiAnalyse } from 'react-icons/bi'
import { RiStockLine } from 'react-icons/ri'

// ─── Constants ─────────────────────────────────────────────────────────────────

const MANAGER_AGENT_ID = '699961350ab3a50ca24854a8'

const ACCENT_COLOR = 'hsl(160, 70%, 40%)'
const ACCENT_COLOR_LIGHT = 'hsl(160, 70%, 50%)'
const ACCENT_BG_SUBTLE = 'hsl(160, 70%, 40%, 0.12)'
const ACCENT_BG_MEDIUM = 'hsl(160, 70%, 40%, 0.2)'

const SUGGESTED_PROMPTS = [
  { text: 'Most reliable BIST 100 stocks', icon: FiShield },
  { text: 'Low volatility banking stocks', icon: FiBarChart2 },
  { text: 'Best analyst-rated ISE stocks', icon: FiTrendingUp },
  { text: 'Safe dividend stocks in BIST', icon: BsGraphUp },
]

const AGENTS_INFO = [
  { id: MANAGER_AGENT_ID, name: 'ISE Stock Advisor Manager', role: 'Coordinator' },
  { id: '69996128730bbd74d53e89c9', name: 'Volatility Research Agent', role: 'Volatility Analysis' },
  { id: '69996128a63b170a3b8170e0', name: 'Analyst Ratings Agent', role: 'Ratings Research' },
]

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StockRecommendation {
  ticker: string
  name: string
  volatility: string
  rating: string
  rationale: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  stocks?: StockRecommendation[]
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

// ─── Stock Parsing ─────────────────────────────────────────────────────────────

function parseStockRecommendations(text: string): StockRecommendation[] {
  const stocks: StockRecommendation[] = []
  if (!text) return stocks

  const sections = text.split(/(?=\d+\.\s+\*\*[A-Z])|(?=\*\*[A-Z]{3,6}\s)|(?=###\s)/g)

  for (const section of sections) {
    const tickerMatch = section.match(/\*\*([A-Z]{3,6})\*\*|\b([A-Z]{3,6})\b\s*[-:(\[]/)
    if (!tickerMatch) continue

    const ticker = tickerMatch[1] || tickerMatch[2]
    if (!ticker) continue

    const commonWords = ['THE', 'AND', 'FOR', 'NOT', 'BUT', 'ARE', 'WAS', 'HAS', 'HAD', 'HIS', 'HER', 'ITS', 'ALSO', 'BEEN', 'CAN', 'DID', 'GET', 'LET', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'BOY', 'ALL', 'ANY', 'HOW', 'MAN', 'OUR', 'OUT', 'DAY', 'USE', 'TWO', 'SET', 'LOW', 'HIGH', 'BASED', 'STOCK', 'LONG', 'TERM', 'RISK', 'BOTH', 'SAFE', 'WITH', 'FROM', 'THAT', 'THIS', 'WILL', 'THEY', 'HAVE', 'EACH', 'MAKE', 'LIKE', 'JUST', 'OVER', 'SUCH', 'TAKE', 'YEAR', 'THEM', 'SOME', 'THAN', 'VERY', 'WHEN', 'WHAT', 'YOUR', 'SAID', 'GOOD']
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
    const globalTickerPattern = /\*\*([A-Z]{3,6})\*\*/g
    let match
    const seen = new Set<string>()
    const commonWords = ['THE', 'AND', 'FOR', 'NOT', 'BUT', 'ARE', 'WAS', 'HAS', 'HAD', 'ISE', 'BIST']

    while ((match = globalTickerPattern.exec(text)) !== null) {
      const t = match[1]
      if (seen.has(t) || commonWords.includes(t)) continue
      seen.add(t)
      stocks.push({ ticker: t, name: t, volatility: 'Medium', rating: 'Hold', rationale: '' })
    }
  }

  return stocks.slice(0, 10)
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

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

// ─── Stock Card Component ──────────────────────────────────────────────────────

function StockCard({ stock }: { stock: StockRecommendation }) {
  const volColor = stock.volatility === 'Low'
    ? '#22c55e'
    : stock.volatility === 'High'
      ? '#ef4444'
      : '#eab308'

  const ratingColor = stock.rating === 'Buy'
    ? '#22c55e'
    : stock.rating === 'Sell'
      ? '#ef4444'
      : '#eab308'

  const ratingBg = stock.rating === 'Buy'
    ? 'rgba(34,197,94,0.15)'
    : stock.rating === 'Sell'
      ? 'rgba(239,68,68,0.15)'
      : 'rgba(234,179,8,0.15)'

  return (
    <div className="rounded-xl border border-border bg-background/50 p-3.5 hover:border-border/80 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide"
            style={{ backgroundColor: ACCENT_BG_MEDIUM, color: ACCENT_COLOR_LIGHT }}
          >
            {stock.ticker}
          </span>
          <span className="text-sm font-medium text-foreground truncate max-w-[160px]">
            {stock.name !== stock.ticker ? stock.name : ''}
          </span>
        </div>
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: ratingBg, color: ratingColor }}
        >
          {stock.rating}
        </span>
      </div>
      <div className="flex items-center gap-3 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: volColor }} />
          <span className="text-xs text-muted-foreground">
            {stock.volatility} Volatility
          </span>
        </div>
      </div>
      {stock.rationale && (
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {stock.rationale}
        </p>
      )}
    </div>
  )
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function MessageSkeleton() {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT_BG_SUBTLE }}>
        <BiAnalyse className="w-4 h-4 animate-spin" style={{ color: ACCENT_COLOR }} />
      </div>
      <div className="flex-1 space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">Analyzing ISE stocks...</span>
        </div>
        <Skeleton className="h-3 w-full bg-muted" />
        <Skeleton className="h-3 w-5/6 bg-muted" />
        <Skeleton className="h-3 w-4/6 bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          <Skeleton className="h-20 rounded-xl bg-muted" />
          <Skeleton className="h-20 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  )
}

// ─── Welcome Screen ────────────────────────────────────────────────────────────

function WelcomeScreen({ onPromptClick }: { onPromptClick: (text: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: ACCENT_BG_MEDIUM, boxShadow: `0 8px 24px ${ACCENT_BG_SUBTLE}` }}>
            <RiStockLine className="w-8 h-8" style={{ color: ACCENT_COLOR_LIGHT }} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          ISE Reliable Stocks Advisor
        </h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
          AI-powered analysis for safe, long-term investments on the Istanbul Stock Exchange. Powered by volatility research and analyst ratings.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTED_PROMPTS.map((prompt) => {
            const Icon = prompt.icon
            return (
              <button
                key={prompt.text}
                onClick={() => onPromptClick(prompt.text)}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card text-left text-sm text-foreground/90 hover:border-border/80 hover:bg-secondary/50 transition-all duration-200 group"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200" style={{ backgroundColor: ACCENT_BG_SUBTLE }}>
                  <Icon className="w-4 h-4 transition-colors duration-200" style={{ color: ACCENT_COLOR }} />
                </span>
                <span className="leading-tight">{prompt.text}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Agent Status Bar ──────────────────────────────────────────────────────────

function AgentStatusBar({ activeAgentId }: { activeAgentId: string | null }) {
  return (
    <div className="px-4 py-2.5 border-t border-border bg-card/50">
      <div className="flex items-center gap-4 overflow-x-auto">
        <span className="text-xs text-muted-foreground whitespace-nowrap font-medium flex items-center gap-1.5">
          <MdOutlineAnalytics className="w-3.5 h-3.5" />
          Agents
        </span>
        {AGENTS_INFO.map((agent) => {
          const isActive = activeAgentId === agent.id
          return (
            <TooltipProvider key={agent.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span
                      className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'animate-pulse' : '')}
                      style={{ backgroundColor: isActive ? ACCENT_COLOR_LIGHT : 'hsl(160, 15%, 30%)' }}
                    />
                    <span className={cn('text-xs', isActive ? 'font-medium' : 'text-muted-foreground')} style={isActive ? { color: ACCENT_COLOR_LIGHT } : undefined}>
                      {agent.role}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                  <p className="text-xs">{agent.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sidebar Conversation Item ─────────────────────────────────────────────────

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-200 group',
        isActive
          ? 'bg-secondary/80 text-foreground'
          : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
      )}
    >
      <FiMessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      <span className="truncate flex-1">{conversation.title}</span>
    </button>
  )
}

// ─── ErrorBoundary ─────────────────────────────────────────────────────────────

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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Page() {
  // Session IDs
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substring(2, 15))
  const [sessionId, setSessionId] = useState(() => 'session_' + Date.now().toString(36))

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  // UI state
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sampleDataOn, setSampleDataOn] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Current conversation
  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null
  const messages = activeConversation?.messages ?? []

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, isLoading, scrollToBottom])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [activeConversationId])

  // Sample data
  useEffect(() => {
    if (sampleDataOn && conversations.length === 0) {
      const sampleConvo: Conversation = {
        id: 'sample_1',
        title: 'Most reliable BIST 100 stocks',
        createdAt: new Date(),
        messages: [
          {
            id: 'sm1',
            role: 'user',
            content: 'What are the most reliable BIST 100 stocks for long-term investment?',
            timestamp: new Date(),
          },
          {
            id: 'sm2',
            role: 'assistant',
            content: '## Top Reliable BIST 100 Stocks\n\nBased on comprehensive volatility research and analyst sentiment analysis, here are the most reliable stocks on the Istanbul Stock Exchange:\n\n### 1. **THYAO** - Turkish Airlines\n- Low volatility over the past 12 months\n- Strong buy consensus from major analysts\n- Rationale: Dominant market position in aviation with growing international routes\n\n### 2. **ASELS** - Aselsan\n- Low volatility profile\n- Buy rating from most coverage analysts\n- Rationale: Leading defense electronics company with government contracts providing stable revenue\n\n### 3. **BIMAS** - BIM Birlesik Magazalar\n- Low volatility, defensive retail sector\n- Strong buy consensus\n- Rationale: Largest discount retail chain with consistent growth and defensive positioning\n\n### 4. **TUPRS** - Tupras\n- Medium volatility, energy sector\n- Buy consensus\n- Rationale: Only domestic oil refinery, benefiting from strong demand and pricing power\n\n### 5. **KCHOL** - Koc Holding\n- Low volatility conglomerate\n- Hold to buy rating\n- Rationale: Diversified exposure across banking, automotive, energy, and consumer goods\n\n---\n\nThese stocks combine low-to-medium volatility with positive analyst sentiment, making them suitable for conservative, long-term portfolios on the ISE.',
            timestamp: new Date(),
            stocks: [
              { ticker: 'THYAO', name: 'Turkish Airlines', volatility: 'Low', rating: 'Buy', rationale: 'Dominant market position in aviation with growing international routes' },
              { ticker: 'ASELS', name: 'Aselsan', volatility: 'Low', rating: 'Buy', rationale: 'Leading defense electronics company with government contracts' },
              { ticker: 'BIMAS', name: 'BIM Birlesik Magazalar', volatility: 'Low', rating: 'Buy', rationale: 'Largest discount retail chain with consistent growth' },
              { ticker: 'TUPRS', name: 'Tupras', volatility: 'Medium', rating: 'Buy', rationale: 'Only domestic oil refinery with strong demand' },
              { ticker: 'KCHOL', name: 'Koc Holding', volatility: 'Low', rating: 'Hold', rationale: 'Diversified conglomerate with stable revenue streams' },
            ],
          },
        ],
      }
      setConversations([sampleConvo])
      setActiveConversationId('sample_1')
    }
    if (!sampleDataOn && conversations.length === 1 && conversations[0]?.id === 'sample_1') {
      setConversations([])
      setActiveConversationId(null)
    }
  }, [sampleDataOn, conversations.length, conversations])

  // Create new conversation
  const createNewConversation = useCallback(() => {
    const newSessionId = 'session_' + Date.now().toString(36)
    setSessionId(newSessionId)
    setActiveConversationId(null)
    setInputValue('')
    setSidebarOpen(false)
    inputRef.current?.focus()
  }, [])

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    setInputValue('')

    const userMessage: Message = {
      id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }

    let currentConvoId = activeConversationId

    if (!currentConvoId) {
      const newConvo: Conversation = {
        id: 'conv_' + Date.now().toString(36),
        title: trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed,
        messages: [userMessage],
        createdAt: new Date(),
      }
      currentConvoId = newConvo.id
      setConversations(prev => [newConvo, ...prev])
      setActiveConversationId(currentConvoId)
    } else {
      setConversations(prev =>
        prev.map(c =>
          c.id === currentConvoId
            ? { ...c, messages: [...c.messages, userMessage] }
            : c
        )
      )
    }

    setIsLoading(true)
    setActiveAgentId(MANAGER_AGENT_ID)

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
          responseText = 'Analysis complete. No detailed text was returned by the agent.'
        }
        stocks = parseStockRecommendations(responseText)
      } else {
        responseText = result?.error ?? 'An error occurred while analyzing stocks. Please try again.'
      }

      const assistantMessage: Message = {
        id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        stocks,
      }

      const finalConvoId = currentConvoId
      setConversations(prev =>
        prev.map(c =>
          c.id === finalConvoId
            ? { ...c, messages: [...c.messages, assistantMessage] }
            : c
        )
      )
    } catch {
      const errorMessage: Message = {
        id: 'msg_err_' + Date.now().toString(36),
        role: 'assistant',
        content: 'A network error occurred. Please check your connection and try again.',
        timestamp: new Date(),
      }
      const finalConvoId = currentConvoId
      setConversations(prev =>
        prev.map(c =>
          c.id === finalConvoId
            ? { ...c, messages: [...c.messages, errorMessage] }
            : c
        )
      )
    } finally {
      setIsLoading(false)
      setActiveAgentId(null)
    }
  }, [activeConversationId, isLoading, userId, sessionId])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }, [inputValue, sendMessage])

  return (
    <ErrorBoundary>
      <div className="min-h-screen h-screen flex bg-background text-foreground overflow-hidden">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:relative z-40 h-full w-[280px] flex flex-col border-r transition-transform duration-300 ease-in-out',
            'bg-[hsl(160,30%,5%)] border-[hsl(160,22%,12%)]',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Sidebar Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[hsl(160,22%,12%)]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: ACCENT_BG_MEDIUM }}>
              <AiOutlineStock className="w-5 h-5" style={{ color: ACCENT_COLOR_LIGHT }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">ISE Stock Advisor</h2>
              <p className="text-xs text-muted-foreground">Istanbul Exchange</p>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="px-3 py-3">
            <Button
              onClick={createNewConversation}
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl border-border bg-transparent text-foreground hover:bg-secondary/50 h-10"
            >
              <FiPlus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          <Separator className="opacity-30" />

          {/* Conversations List */}
          <ScrollArea className="flex-1 px-3 py-2">
            <div className="space-y-1">
              {conversations.length === 0 ? (
                <div className="text-center py-8 px-2">
                  <FiMessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground/60">No conversations yet</p>
                </div>
              ) : (
                conversations.map((convo) => (
                  <ConversationItem
                    key={convo.id}
                    conversation={convo}
                    isActive={convo.id === activeConversationId}
                    onClick={() => {
                      setActiveConversationId(convo.id)
                      setSidebarOpen(false)
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Sample Data Toggle */}
          <div className="px-4 py-3 border-t border-[hsl(160,22%,12%)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sample Data</span>
              <button
                onClick={() => setSampleDataOn(prev => !prev)}
                className={cn(
                  'relative w-9 h-5 rounded-full transition-colors duration-200',
                  sampleDataOn ? 'bg-[hsl(160,70%,40%)]' : 'bg-muted'
                )}
                role="switch"
                aria-checked={sampleDataOn}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200',
                    sampleDataOn ? 'translate-x-4' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/30">
            <div className="flex items-center gap-3">
              {/* Mobile menu */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <HiOutlineChartBar className="w-5 h-5" style={{ color: ACCENT_COLOR }} />
                <h1 className="text-sm font-semibold text-foreground">
                  {activeConversation ? activeConversation.title : 'New Conversation'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoading && (
                <Badge variant="outline" className="text-xs border-border gap-1.5 animate-pulse" style={{ color: ACCENT_COLOR }}>
                  <IoSparkles className="w-3 h-3" />
                  Analyzing
                </Badge>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 && !isLoading ? (
              <WelcomeScreen onPromptClick={(text) => sendMessage(text)} />
            ) : (
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: ACCENT_BG_SUBTLE }}>
                        <RiStockLine className="w-4 h-4" style={{ color: ACCENT_COLOR }} />
                      </div>
                    )}

                    <div
                      className={cn(
                        'rounded-xl px-4 py-3 max-w-[85%]',
                        msg.role === 'user'
                          ? 'bg-secondary text-foreground'
                          : 'bg-card border border-border'
                      )}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-sm">{msg.content}</p>
                      ) : (
                        <div className="space-y-4">
                          {/* Stock cards if parsed */}
                          {Array.isArray(msg.stocks) && msg.stocks.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {msg.stocks.map((stock) => (
                                <StockCard key={stock.ticker} stock={stock} />
                              ))}
                            </div>
                          )}
                          {/* Markdown content */}
                          {renderMarkdown(msg.content)}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground/50 mt-2 select-none">
                        {msg.timestamp instanceof Date
                          ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </p>
                    </div>

                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-foreground">U</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading skeleton */}
                {isLoading && <MessageSkeleton />}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Agent Status */}
          <AgentStatusBar activeAgentId={activeAgentId} />

          {/* Input Bar */}
          <div className="border-t border-border bg-card/50 px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about reliable ISE stocks..."
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl border border-border bg-input px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(160,70%,40%)] focus:border-transparent disabled:opacity-50 transition-all duration-200"
                />
              </div>
              <Button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="h-11 px-5 rounded-xl font-medium text-sm gap-2 transition-all duration-200"
                style={{
                  backgroundColor: !inputValue.trim() || isLoading ? 'hsl(160, 22%, 15%)' : ACCENT_COLOR,
                  color: !inputValue.trim() || isLoading ? 'hsl(160, 15%, 40%)' : 'hsl(160, 20%, 98%)',
                }}
              >
                <FiSend className="w-4 h-4" />
                Analyze
              </Button>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
