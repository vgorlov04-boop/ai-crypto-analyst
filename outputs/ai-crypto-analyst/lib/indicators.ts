// Server-side technical indicator calculation (technicalindicators, MIT).

import { EMA, MACD, RSI } from 'technicalindicators'
import type {
  Candle,
  IndicatorPoint,
  LatestIndicators,
  MacdPoint,
  SignalComponent,
  SignalDirection,
  SignalStrength,
  SignalSummary,
} from './market'

const RSI_PERIOD = 14
const EMA_FAST = 20
const EMA_MID = 50
const EMA_SLOW = 200
const MACD_FAST = 12
const MACD_SLOW = 26
const MACD_SIGNAL = 9

function round(value: number, digits = 4): number {
  const safe = Number.isFinite(value) ? value : 0
  const factor = 10 ** digits
  return Math.round(safe * factor) / factor
}

function alignSeries(values: number[], candles: Candle[]): IndicatorPoint[] {
  const offset = candles.length - values.length
  const points: IndicatorPoint[] = []
  for (let i = 0; i < values.length; i += 1) {
    const candle = candles[offset + i]
    const value = values[i]
    if (!candle || typeof value !== 'number' || !Number.isFinite(value)) continue
    points.push({ time: candle.time, value: round(value) })
  }
  return points
}

export function computeEma(candles: Candle[], period: number): IndicatorPoint[] {
  const closes = candles.map((c: Candle) => c.close)
  if (closes.length < period + 1) return []
  const values = EMA.calculate({ period, values: closes })
  return alignSeries(Array.isArray(values) ? values : [], candles)
}

export function computeRsi(candles: Candle[], period = RSI_PERIOD): IndicatorPoint[] {
  const closes = candles.map((c: Candle) => c.close)
  if (closes.length < period + 1) return []
  const values = RSI.calculate({ period, values: closes })
  return alignSeries(Array.isArray(values) ? values : [], candles)
}

export function computeMacd(candles: Candle[]): MacdPoint[] {
  const closes = candles.map((c: Candle) => c.close)
  if (closes.length < MACD_SLOW + MACD_SIGNAL) return []

  const raw = MACD.calculate({
    values: closes,
    fastPeriod: MACD_FAST,
    slowPeriod: MACD_SLOW,
    signalPeriod: MACD_SIGNAL,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  })

  const rows = Array.isArray(raw) ? raw : []
  const offset = candles.length - rows.length
  const points: MacdPoint[] = []

  for (let i = 0; i < rows.length; i += 1) {
    const candle = candles[offset + i]
    const row = rows[i]
    if (!candle || !row) continue
    const macdValue = typeof row.MACD === 'number' ? row.MACD : 0
    const signalValue = typeof row.signal === 'number' ? row.signal : 0
    const histogram = typeof row.histogram === 'number' ? row.histogram : macdValue - signalValue
    points.push({
      time: candle.time,
      macd: round(macdValue),
      signal: round(signalValue),
      histogram: round(histogram),
    })
  }

  return points
}

function lastValue(points: IndicatorPoint[]): number {
  const last = points[points.length - 1]
  return last && Number.isFinite(last.value) ? last.value : 0
}

function directionFromVote(vote: number): SignalDirection {
  if (vote > 0) return 'BUY'
  if (vote < 0) return 'SELL'
  return 'NEUTRAL'
}

export function buildSignal(params: {
  close: number
  rsi: number
  macd: number
  macdSignal: number
  ema20: number
  ema50: number
  ema200: number
}): SignalSummary {
  const { close, rsi, macd, macdSignal, ema20, ema50, ema200 } = params

  const rsiVote = rsi > 0 && rsi < 30 ? 1 : rsi > 70 ? -1 : 0
  const macdVote = macd > macdSignal ? 1 : macd < macdSignal ? -1 : 0
  const emaVote = ema20 > 0 && ema50 > 0 ? (ema20 > ema50 ? 1 : -1) : 0
  const trendVote = ema200 > 0 ? (close > ema200 ? 1 : -1) : 0

  const components: SignalComponent[] = [
    {
      key: 'rsi',
      label: `RSI(${RSI_PERIOD})`,
      weight: 25,
      vote: rsiVote,
      verdict: directionFromVote(rsiVote),
      detail:
        rsiVote > 0
          ? `Перепроданность (${round(rsi, 1)}) — сигнал к росту`
          : rsiVote < 0
            ? `Перекупленность (${round(rsi, 1)}) — риск коррекции`
            : `Нейтральная зона (${round(rsi, 1)}) — голоса нет`,
    },
    {
      key: 'macd',
      label: `MACD(${MACD_FAST},${MACD_SLOW},${MACD_SIGNAL})`,
      weight: 35,
      vote: macdVote,
      verdict: directionFromVote(macdVote),
      detail:
        macdVote > 0
          ? 'MACD выше сигнальной линии — импульс вверх'
          : macdVote < 0
            ? 'MACD ниже сигнальной линии — импульс вниз'
            : 'MACD совпадает с сигнальной линией',
    },
    {
      key: 'ema',
      label: `EMA ${EMA_FAST}/${EMA_MID}`,
      weight: 25,
      vote: emaVote,
      verdict: directionFromVote(emaVote),
      detail:
        emaVote > 0
          ? `EMA${EMA_FAST} выше EMA${EMA_MID} — краткосрочный рост`
          : emaVote < 0
            ? `EMA${EMA_FAST} ниже EMA${EMA_MID} — краткосрочное снижение`
            : 'Недостаточно данных для пересечения EMA',
    },
    {
      key: 'trend',
      label: `Тренд vs EMA${EMA_SLOW}`,
      weight: 15,
      vote: trendVote,
      verdict: directionFromVote(trendVote),
      detail:
        trendVote > 0
          ? `Цена выше EMA${EMA_SLOW} — бычий тренд`
          : trendVote < 0
            ? `Цена ниже EMA${EMA_SLOW} — медвежий тренд`
            : 'Недостаточно данных для EMA200',
    },
  ]

  const weighted = components.reduce((acc: number, item: SignalComponent) => {
    return acc + (item.weight / 100) * item.vote
  }, 0)

  const score = Math.max(0, Math.min(100, Math.round(50 + weighted * 50)))
  const distance = Math.abs(score - 50)

  const strength: SignalStrength = distance >= 20 ? 'strong' : distance >= 5 ? 'weak' : 'neutral'
  const direction: SignalDirection = score > 54 ? 'BUY' : score < 46 ? 'SELL' : 'NEUTRAL'

  const label = direction === 'BUY' ? 'ПОКУПКА' : direction === 'SELL' ? 'ПРОДАЖА' : 'НЕЙТРАЛЬНО'
  const strengthLabel = strength === 'strong' ? 'Сильный сигнал' : strength === 'weak' ? 'Слабый сигнал' : 'Нет сигнала'

  return { score, direction, strength, label, strengthLabel, components }
}

export function buildLatest(params: {
  candles: Candle[]
  rsi: IndicatorPoint[]
  macd: MacdPoint[]
  ema20: IndicatorPoint[]
  ema50: IndicatorPoint[]
  ema200: IndicatorPoint[]
}): LatestIndicators {
  const { candles, rsi, macd, ema20, ema50, ema200 } = params
  const lastCandle = candles[candles.length - 1]
  const close = lastCandle && Number.isFinite(lastCandle.close) ? lastCandle.close : 0
  const rsiValue = round(lastValue(rsi), 2)
  const lastMacd = macd[macd.length - 1]
  const ema200Value = lastValue(ema200)

  return {
    close,
    rsi: rsiValue,
    rsiZone: rsiValue > 0 && rsiValue < 30 ? 'oversold' : rsiValue > 70 ? 'overbought' : 'neutral',
    macd: round(lastMacd?.macd ?? 0, 2),
    macdSignal: round(lastMacd?.signal ?? 0, 2),
    macdHistogram: round(lastMacd?.histogram ?? 0, 2),
    ema20: round(lastValue(ema20), 2),
    ema50: round(lastValue(ema50), 2),
    ema200: round(ema200Value, 2),
    priceVsEma200: ema200Value > 0 ? round(((close - ema200Value) / ema200Value) * 100, 2) : 0,
  }
}
