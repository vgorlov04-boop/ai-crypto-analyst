// Server-side Binance Public API client with mirror fallback + in-memory cache.
// No API keys required: only public market data endpoints are used.

import type { Candle, Interval, SymbolKey, TickerData } from './market'

const HOSTS = ['https://data-api.binance.vision']

const REQUEST_TIMEOUT_MS = 9000

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

function readCache<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.value as T
}

function writeCache<T>(key: string, value: T, ttlMs: number): void {
  if (cache.size > 200) cache.clear()
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

async function binanceGet<T>(path: string, hosts: readonly string[] = HOSTS): Promise<T> {
  let lastError: unknown = null

  for (const host of hosts) {
    try {
      const response = await fetch(`${host}${path}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!response.ok) {
        lastError = new Error(`Binance ${response.status}`)
        continue
      }
      const json = (await response.json()) as T
      return json
    } catch (error) {
      lastError = error
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'unknown error'
  throw new Error(`Не удалось получить данные с Binance (${message})`)
}

interface RawTicker {
  symbol?: string
  lastPrice?: string
  priceChange?: string
  priceChangePercent?: string
  highPrice?: string
  lowPrice?: string
  volume?: string
  quoteVolume?: string
}

function toNumber(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) ? parsed : 0
}

function mapTicker(raw: RawTicker): TickerData {
  return {
    symbol: raw?.symbol ?? '',
    price: toNumber(raw?.lastPrice),
    change: toNumber(raw?.priceChange),
    changePercent: toNumber(raw?.priceChangePercent),
    high: toNumber(raw?.highPrice),
    low: toNumber(raw?.lowPrice),
    volume: toNumber(raw?.volume),
    quoteVolume: toNumber(raw?.quoteVolume),
    updatedAt: Date.now(),
  }
}

export async function fetchTickers(symbols: readonly SymbolKey[]): Promise<TickerData[]> {
  const safeSymbols = symbols.length > 0 ? symbols : (['BTCUSDT'] as const)
  const results = await Promise.allSettled(safeSymbols.map(async (symbol) => {
    const key = `ticker:${symbol}`
    const cached = readCache<TickerData>(key)
    if (cached) return cached
    const raw = await binanceGet<RawTicker>(`/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`)
    const ticker = mapTicker(raw)
    writeCache(key, ticker, 5000)
    return ticker
  }))
  const tickers = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
  if (tickers.length === 0) {
    const firstError = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')?.reason
    throw firstError instanceof Error ? firstError : new Error('Не удалось получить котировки Binance Spot')
  }
  return tickers
}

export async function fetchKlines(
  symbol: SymbolKey,
  interval: Interval,
  limit: number
): Promise<Candle[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 500, 60), 1000)
  const key = `klines:${symbol}:${interval}:${safeLimit}`
  const cached = readCache<Candle[]>(key)
  if (cached) return cached

  const path = `/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${safeLimit}`
  const raw = await binanceGet<unknown[]>(path)
  const rows = Array.isArray(raw) ? raw : []

  const candles: Candle[] = []
  for (const row of rows) {
    if (!Array.isArray(row)) continue
    const openTime = Number(row[0])
    const open = Number.parseFloat(String(row[1] ?? ''))
    const high = Number.parseFloat(String(row[2] ?? ''))
    const low = Number.parseFloat(String(row[3] ?? ''))
    const close = Number.parseFloat(String(row[4] ?? ''))
    const volume = Number.parseFloat(String(row[5] ?? ''))
    if (!Number.isFinite(openTime) || !Number.isFinite(close)) continue
    candles.push({
      time: Math.floor(openTime / 1000),
      open: Number.isFinite(open) ? open : close,
      high: Number.isFinite(high) ? high : close,
      low: Number.isFinite(low) ? low : close,
      close,
      volume: Number.isFinite(volume) ? volume : 0,
    })
  }

  const ttl = interval === '1d' ? 60_000 : 15_000
  writeCache(key, candles, ttl)
  return candles
}
