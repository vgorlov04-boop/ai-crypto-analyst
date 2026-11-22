'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Info,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  WifiOff,
  Plus,
  X,
  Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PriceCard } from '@/components/price-card'
import { IndicatorsPanel } from '@/components/indicators-panel'
import { SiteHeader } from '@/components/site-header'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import {
  INTERVALS,
  INTERVAL_LABELS,
  SYMBOLS,
  getSymbolMeta,
  pricePrecision,
  type Candle,
  type IndicatorsResponse,
  type Interval,
  type KlinesResponse,
  type SymbolKey,
  type TickerData,
} from '@/lib/market'

const CandlestickChart = dynamic(() => import('@/components/candlestick-chart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center gap-2 text-xs text-muted-foreground">
      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      Загрузка графика…
    </div>
  ),
})

const TICKER_POLL_MS = 30_000
const ANALYSIS_POLL_MS = 60_000

interface ApiFailure {
  ok?: false
  error?: string
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
    </span>
  )
}

export function MarketDashboard() {
  const [symbols, setSymbols] = useState<string[]>([...SYMBOLS])
  const [watchlistReady, setWatchlistReady] = useState(false)
  const [newTicker, setNewTicker] = useState('')
  const [tickerSearchLoading, setTickerSearchLoading] = useState(false)
  const [watchlistError, setWatchlistError] = useState<string | null>(null)
  const [tickers, setTickers] = useState<Record<string, TickerData>>({})
  const [tickerError, setTickerError] = useState<string | null>(null)
  const [tickerUpdatedAt, setTickerUpdatedAt] = useState<number | null>(null)

  const [symbol, setSymbol] = useState<SymbolKey>('BTCUSDT')
  const [timeframe, setTimeframe] = useState<Interval>('1h')

  const [candles, setCandles] = useState<Candle[]>([])
  const [indicators, setIndicators] = useState<IndicatorsResponse | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const analysisRequestRef = useRef(0)

  const loadTickers = useCallback(async () => {
    try {
      const response = await fetch(`/api/binance/ticker?symbols=${symbols.join(',')}`, {
        cache: 'no-store',
      })
      const json = await response.json()
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? 'Ошибка загрузки котировок')
      }
      const list: TickerData[] = Array.isArray(json?.data) ? json.data : []
      const map: Record<string, TickerData> = {}
      for (const item of list) {
        if (item?.symbol) map[item.symbol] = item
      }
      setTickers((current) => ({ ...current, ...map }))
      setTickerUpdatedAt(Date.now())
      setTickerError(null)
    } catch (error) {
      setTickerError(error instanceof Error ? error.message : 'Не удалось загрузить котировки')
    }
  }, [symbols])

  const loadAnalysis = useCallback(async (nextSymbol: SymbolKey, nextInterval: Interval, silent = false) => {
    const requestId = analysisRequestRef.current + 1
    analysisRequestRef.current = requestId
    if (!silent) setAnalysisLoading(true)
    setAnalysisError(null)

    try {
      const [klinesResponse, indicatorsResponse] = await Promise.all([
        fetch(`/api/binance/klines?symbol=${nextSymbol}&interval=${nextInterval}&limit=500`, {
          cache: 'no-store',
        }),
        fetch(`/api/indicators?symbol=${nextSymbol}&interval=${nextInterval}&limit=500`, {
          cache: 'no-store',
        }),
      ])

      const klinesJson = (await klinesResponse.json()) as KlinesResponse | ApiFailure
      const indicatorsJson = (await indicatorsResponse.json()) as IndicatorsResponse | ApiFailure

      if (analysisRequestRef.current !== requestId) return

      if (!klinesJson?.ok) {
        throw new Error(klinesJson?.error ?? 'Не удалось получить свечные данные')
      }
      if (!indicatorsJson?.ok) {
        throw new Error(indicatorsJson?.error ?? 'Не удалось рассчитать индикаторы')
      }

      setCandles(Array.isArray(klinesJson.candles) ? klinesJson.candles : [])
      setIndicators(indicatorsJson)
    } catch (error) {
      if (analysisRequestRef.current !== requestId) return
      setAnalysisError(
        error instanceof Error ? error.message : 'Не удалось загрузить данные технического анализа'
      )
    } finally {
      if (analysisRequestRef.current === requestId) setAnalysisLoading(false)
    }
  }, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('ai-crypto-analyst.watchlist')
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const valid = [...new Set(parsed.filter((item): item is string => typeof item === 'string' && item !== 'APEXUSDT' && /^[A-Z0-9]{2,16}USDT$/.test(item)))]
          if (valid.length) {
            setSymbols(valid)
            setSymbol((current) => valid.includes(current) ? current : valid[0])
          }
        }
      }
    } catch {
      // Storage can be disabled by browser privacy settings; keep the defaults in memory.
    }
    setWatchlistReady(true)
  }, [])

  useEffect(() => {
    if (watchlistReady) {
      try {
        window.localStorage.setItem('ai-crypto-analyst.watchlist', JSON.stringify(symbols))
      } catch {
        // Keep the watchlist usable for this session when storage is unavailable.
      }
    }
  }, [symbols, watchlistReady])

  useEffect(() => {
    void loadTickers()
  }, [loadTickers])

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadTickers()
    }, TICKER_POLL_MS)
    return () => window.clearInterval(id)
  }, [loadTickers])

  useEffect(() => {
    void loadAnalysis(symbol, timeframe)
  }, [symbol, timeframe, loadAnalysis])

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadAnalysis(symbol, timeframe, true)
    }, ANALYSIS_POLL_MS)
    return () => window.clearInterval(id)
  }, [symbol, timeframe, loadAnalysis])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadTickers(), loadAnalysis(symbol, timeframe, true)])
    } finally {
      setRefreshing(false)
    }
  }, [loadTickers, loadAnalysis, symbol, timeframe])

  const addTicker = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = newTicker.trim().toUpperCase().replace(/\s+/g, '')
    const pair = normalized.endsWith('USDT') ? normalized : `${normalized}USDT`
    if (!/^[A-Z0-9]{2,16}USDT$/.test(pair)) {
      setWatchlistError('Введите тикер монеты, например BTC или GRAMUSDT.')
      return
    }
    if (symbols.includes(pair)) {
      setWatchlistError(`${pair} уже есть в списке.`)
      return
    }
    setTickerSearchLoading(true)
    setWatchlistError(null)
    try {
      const response = await fetch(`/api/binance/ticker?symbol=${encodeURIComponent(pair)}`, { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok || !json?.ok || !Array.isArray(json.data) || !json.data.some((item: TickerData) => item.symbol === pair)) {
        throw new Error(json?.error ?? `Пара ${pair} не найдена на Binance.`)
      }
      setSymbols((current) => current.includes(pair) ? current : [...current, pair])
      setTickers((current) => ({ ...current, [pair]: json.data.find((item: TickerData) => item.symbol === pair) }))
      setNewTicker('')
    } catch (error) {
      setWatchlistError(error instanceof Error ? error.message : 'Не удалось найти эту монету на Binance.')
    } finally {
      setTickerSearchLoading(false)
    }
  }, [newTicker, symbols])

  const removeTicker = useCallback((removed: string) => {
    setSymbols((current) => {
      const next = current.filter((item) => item !== removed)
      if (!next.length) return current
      if (symbol === removed) setSymbol(next[0])
      return next
    })
  }, [symbol])

  const selectedTicker = tickers[symbol] ?? null
  const lastCandle = candles[candles.length - 1]
  const referencePrice = selectedTicker?.price ?? lastCandle?.close ?? 0
  const precision = pricePrecision(referencePrice)
  const hasError = Boolean(tickerError) || Boolean(analysisError)
  const meta = getSymbolMeta(symbol)

  return (
    <div className="mobile-dashboard min-h-screen bg-background">
      <SiteHeader
        lastUpdate={tickerUpdatedAt}
        hasError={Boolean(tickerError)}
        refreshing={refreshing}
        onRefresh={() => void refreshAll()}
      />

      <main className="terminal-bg mobile-terminal-bg">
        <div className="mobile-page-container mx-auto w-full max-w-[1200px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mobile-hero flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                Этап 1 · Рыночная аналитика
              </div>
              <h1 className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">
                AI Crypto Analyst
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Живые котировки, свечи и технические индикаторы для списка монет с агрегированной оценкой
                сигнала. Без подключения биржевых счетов и без реальных сделок.
              </p>
            </div>

            <div className="mobile-source-status grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <div className="panel flex items-center gap-2 px-3 py-2">
                <Server className="h-3.5 w-3.5 text-primary" />
                <div className="leading-tight">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Источник</div>
                  <div className="text-[11px] font-medium">Binance Spot</div>
                </div>
              </div>
              <div className="panel flex items-center gap-2 px-3 py-2">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <div className="leading-tight">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Обновление</div>
                  <div className="text-[11px] font-medium">каждые 30 секунд</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Ошибка котировок */}
          {tickerError ? (
            <div className="mt-5 flex flex-col gap-2 rounded-lg border border-down/30 bg-down-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-down">
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Binance временно недоступен</p>
                  <p className="text-[11px] text-down/80">{tickerError}</p>
                </div>
              </div>
              <Button variant="secondary" size="xs" onClick={() => void refreshAll()} loading={refreshing}>
                Повторить
              </Button>
            </div>
          ) : null}

          {/* Карточки */}
          <section aria-label="Обзор рынка" className="mt-6">
            <form onSubmit={(event) => void addTicker(event)} className="mobile-watchlist-form mb-3 flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="mobile-watchlist-fields flex flex-1 items-center gap-2">
                <div className="mobile-ticker-field relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="Поиск монеты по тикеру" placeholder="Тикер, например ETH или GRAMUSDT" value={newTicker} onChange={(event) => setNewTicker(event.target.value)} className="pl-9" />
                </div>
                <Button type="submit" size="sm" loading={tickerSearchLoading} disabled={tickerSearchLoading} className="mobile-add-button">
                  <Plus className="mr-1 h-4 w-4" /> Добавить
                </Button>
              </div>
              {watchlistError ? <p role="alert" className="text-xs text-down sm:pt-2">{watchlistError}</p> : null}
            </form>
            <div className="mobile-coin-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {symbols.map((item: SymbolKey, index: number) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 * index, ease: 'easeOut' }}
                className="mobile-coin-card relative"
              >
                <PriceCard
                  meta={getSymbolMeta(item)}
                  ticker={tickers[item] ?? null}
                  active={item === symbol}
                  onSelect={setSymbol}
                />
                {symbols.length > 1 ? <button type="button" aria-label={`Удалить ${item} из списка`} onClick={() => removeTicker(item)} className="mobile-coin-remove absolute right-2 top-2 z-10 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-3.5 w-3.5" /></button> : null}
              </motion.div>
            ))}
            </div>
          </section>

          {/* Технический анализ */}
          <section aria-label="Технический анализ" className="mt-8">
            <div className="mobile-analysis-heading flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="mobile-analysis-title flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="font-display text-lg font-semibold tracking-tight">Технический анализ</h2>
                <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {meta.base}/USDT
                </span>
              </div>

              <div className="mobile-control-groups flex flex-wrap items-center gap-2">
                <div
                  role="tablist"
                  aria-label="Выбор актива"
                  className="mobile-symbol-tabs flex rounded-lg border border-border bg-card p-0.5"
                >
                  {symbols.map((item: SymbolKey) => (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={item === symbol}
                      onClick={() => setSymbol(item)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors duration-fast',
                        item === symbol
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {getSymbolMeta(item).base}
                    </button>
                  ))}
                </div>

                <div
                  role="tablist"
                  aria-label="Таймфрейм"
                  className="mobile-interval-tabs flex rounded-lg border border-border bg-card p-0.5"
                >
                  {INTERVALS.map((item: Interval) => (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={item === timeframe}
                      onClick={() => setTimeframe(item)}
                      className={cn(
                        'rounded-md px-2.5 py-1 font-mono text-[11px] font-medium transition-colors duration-fast',
                        item === timeframe
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                      )}
                    >
                      {INTERVAL_LABELS[item]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
              {/* График */}
              <div className="mobile-chart-panel panel min-w-0 self-start overflow-hidden">
                <div className="mobile-chart-heading flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-sm font-semibold tracking-tight">
                      {meta.base}/USDT
                    </span>
                    <span className="tabular font-mono text-xs text-muted-foreground">
                      {referencePrice ? formatPrice(referencePrice, precision) : '—'}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {INTERVAL_LABELS[timeframe]}
                    </span>
                  </div>
                  <div className="mobile-chart-legend flex flex-wrap items-center gap-3">
                    <LegendDot color="#60a5fa" label="EMA20" />
                    <LegendDot color="#fb923c" label="EMA50" />
                    <LegendDot color="#f87171" label="EMA200" />
                  </div>
                </div>

                <div className="mobile-chart-stage relative h-[460px] w-full px-1 pb-1 sm:h-[500px] lg:h-[660px]">
                  {candles.length > 0 ? (
                    <CandlestickChart
                      candles={candles}
                      ema20={indicators?.ema20 ?? []}
                      ema50={indicators?.ema50 ?? []}
                      ema200={indicators?.ema200 ?? []}
                      rsi={indicators?.rsi ?? []}
                      macd={indicators?.macd ?? []}
                      interval={timeframe}
                      precision={precision}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
                      {analysisError ? (
                        <>
                          <AlertTriangle className="h-5 w-5 text-down" />
                          <p className="text-xs font-medium text-foreground">График недоступен</p>
                          <p className="max-w-sm text-[11px] text-muted-foreground">{analysisError}</p>
                          <Button variant="secondary" size="xs" onClick={() => void refreshAll()}>
                            Повторить
                          </Button>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Загрузка свечных данных…</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="mobile-chart-footer flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2 sm:px-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-muted-foreground">RSI 14</span>
                    <span className="font-mono text-[10px] text-muted-foreground">MACD 12·26·9</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">
                    {candles.length > 0 ? `${candles.length} свечей · Binance` : 'Binance Public API'}
                  </span>
                </div>
              </div>

              {/* Панель индикаторов */}
              <div className="mobile-indicator-column min-w-0 self-start">
                <IndicatorsPanel
                  data={indicators}
                  loading={analysisLoading}
                  error={analysisError}
                  timeframe={timeframe}
                  onRetry={() => void refreshAll()}
                />
              </div>
            </div>
          </section>

          {/* Дисклеймер */}
          <footer className="mt-10 border-t border-border/60 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Только для образовательных целей. Не является финансовым советом.
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                <Info className="h-3 w-3" />
                Данные: Binance Public API · индикаторы рассчитаны на сервере
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
