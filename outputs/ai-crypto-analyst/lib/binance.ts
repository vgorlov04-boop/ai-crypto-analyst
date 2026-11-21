// Server-side Binance Public API client with mirror fallback + in-memory cache.
// No API keys required: only public market data endpoints are used.

import type { Candle, Interval, SymbolKey, TickerData } from './market'

const HOSTS = [
  'https://data-api.binance.vision',
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
]
const FUTURES_HOSTS = ['https://fapi.binance.com', 'https://fapi1.binance.com']

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
  const key = `tickers:${safeSymbols.join(',')}`
  const cached = readCache<TickerData[]>(key)
  if (cached) return cached

  const regularSymbols = safeSymbols.filter((symbol) => symbol !== 'APEXUSDT')
  const futuresSymbols = safeSymbols.filter((symbol) => symbol === 'APEXUSDT')
  const results: RawTicker[] = []
  if (regularSymbols.length) {
    const query = encodeURIComponent(JSON.stringify(regularSymbols))
    const raw = await binanceGet<RawTicker[]>(`/api/v3/ticker/24hr?symbols=${query}`)
    if (Array.isArray(raw)) results.push(...raw)
  }
  if (futuresSymbols.length) {
    const raw = await binanceGet<RawTicker | RawTicker[]>(`/fapi/v1/ticker/24hr?symbol=APEXUSDT`, FUTURES_HOSTS)
    if (Array.isArray(raw)) results.push(...raw)
    else results.push(raw)
  }
  const mapped = results.map((item: RawTicker) => mapTicker(item))
  writeCache(key, mapped, 5000)
  return mapped
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

  const isApex = symbol === 'APEXUSDT'
  const path = isApex
    ? `/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${safeLimit}`
    : `/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${safeLimit}`
  const raw = await binanceGet<unknown[]>(path, isApex ? FUTURES_HOSTS : HOSTS)
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
