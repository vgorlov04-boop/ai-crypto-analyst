// Shared (client-safe) market constants and types for AI Crypto Analyst.

// Default watchlist: nine USDT pairs. APEXUSDT is loaded separately from Futures.
export const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'APEXUSDT'] as const

export type SymbolKey = string

export const INTERVALS = ['15m', '1h', '4h', '1d'] as const

export type Interval = (typeof INTERVALS)[number]

export const INTERVAL_LABELS: Record<Interval, string> = {
  '15m': '15м',
  '1h': '1ч',
  '4h': '4ч',
  '1d': '1д',
}

export interface SymbolMeta {
  symbol: SymbolKey
  base: string
  name: string
  accent: string
}

export const SYMBOL_META: Record<string, SymbolMeta> = {
  BTCUSDT: { symbol: 'BTCUSDT', base: 'BTC', name: 'Bitcoin', accent: '#f7931a' },
  ETHUSDT: { symbol: 'ETHUSDT', base: 'ETH', name: 'Ethereum', accent: '#8b93ff' },
  SOLUSDT: { symbol: 'SOLUSDT', base: 'SOL', name: 'Solana', accent: '#14f195' },
  BNBUSDT: { symbol: 'BNBUSDT', base: 'BNB', name: 'BNB', accent: '#f3ba2f' },
  XRPUSDT: { symbol: 'XRPUSDT', base: 'XRP', name: 'XRP', accent: '#346aa9' },
  ADAUSDT: { symbol: 'ADAUSDT', base: 'ADA', name: 'Cardano', accent: '#3468d1' },
  DOGEUSDT: { symbol: 'DOGEUSDT', base: 'DOGE', name: 'Dogecoin', accent: '#c3a634' },
  LINKUSDT: { symbol: 'LINKUSDT', base: 'LINK', name: 'Chainlink', accent: '#2a5ada' },
  AVAXUSDT: { symbol: 'AVAXUSDT', base: 'AVAX', name: 'Avalanche', accent: '#e84142' },
  APEXUSDT: { symbol: 'APEXUSDT', base: 'APEX', name: 'ApeX Protocol', accent: '#8b5cf6' },
}

export interface TickerData {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  quoteVolume: number
  updatedAt: number
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface IndicatorPoint {
  time: number
  value: number
}

export interface MacdPoint {
  time: number
  macd: number
  signal: number
  histogram: number
}

export type SignalDirection = 'BUY' | 'SELL' | 'NEUTRAL'
export type SignalStrength = 'strong' | 'weak' | 'neutral'

export interface SignalComponent {
  key: 'rsi' | 'macd' | 'ema' | 'trend'
  label: string
  weight: number
  vote: number
  verdict: SignalDirection
  detail: string
}

export interface SignalSummary {
  score: number
  direction: SignalDirection
  strength: SignalStrength
  label: string
  strengthLabel: string
  components: SignalComponent[]
}

export interface LatestIndicators {
  close: number
  rsi: number
  rsiZone: 'oversold' | 'neutral' | 'overbought'
  macd: number
  macdSignal: number
  macdHistogram: number
  ema20: number
  ema50: number
  ema200: number
  priceVsEma200: number
}

export interface IndicatorsResponse {
  ok: true
  symbol: SymbolKey
  interval: Interval
  ema20: IndicatorPoint[]
  ema50: IndicatorPoint[]
  ema200: IndicatorPoint[]
  rsi: IndicatorPoint[]
  macd: MacdPoint[]
  latest: LatestIndicators
  signal: SignalSummary
  updatedAt: number
}

export interface KlinesResponse {
  ok: true
  symbol: SymbolKey
  interval: Interval
  candles: Candle[]
}

export interface ApiError {
  ok: false
  error: string
}

export function isSymbolKey(value: string | null | undefined): value is SymbolKey {
  return !!value && /^[A-Z0-9]{2,16}USDT$/.test(value)
}

export function getSymbolMeta(symbol: string): SymbolMeta {
  return SYMBOL_META[symbol] ?? {
    symbol,
    base: symbol.replace(/USDT$/, ''),
    name: symbol.replace(/USDT$/, ''),
    accent: '#60a5fa',
  }
}

export function isInterval(value: string | null | undefined): value is Interval {
  return !!value && (INTERVALS as readonly string[]).includes(value)
}

export function pricePrecision(price: number): number {
  const safe = Number.isFinite(price) ? Math.abs(price) : 0
  if (safe >= 1000) return 2
  if (safe >= 10) return 2
  if (safe >= 1) return 3
  if (safe >= 0.01) return 5
  return 8
}
