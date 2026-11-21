import { NextResponse } from 'next/server'
import { fetchKlines } from '@/lib/binance'
import { buildLatest, buildSignal, computeEma, computeMacd, computeRsi } from '@/lib/indicators'
import { isInterval, isSymbolKey } from '@/lib/market'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const symbol = (url.searchParams.get('symbol') ?? 'BTCUSDT').trim().toUpperCase()
    const interval = (url.searchParams.get('interval') ?? '1h').trim()
    const limitRaw = Number.parseInt(url.searchParams.get('limit') ?? '500', 10)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 60), 1000) : 500

    if (!isSymbolKey(symbol)) {
      return NextResponse.json(
        { ok: false, error: 'Неподдерживаемый торговый символ' },
        { status: 400 }
      )
    }

    if (!isInterval(interval)) {
      return NextResponse.json(
        { ok: false, error: 'Неподдерживаемый таймфрейм' },
        { status: 400 }
      )
    }

    const candles = await fetchKlines(symbol, interval, limit)

    if (candles.length < 60) {
      return NextResponse.json(
        { ok: false, error: 'Недостаточно свечных данных для расчёта индикаторов' },
        { status: 502 }
      )
    }

    const ema20 = computeEma(candles, 20)
    const ema50 = computeEma(candles, 50)
    const ema200 = computeEma(candles, 200)
    const rsi = computeRsi(candles, 14)
    const macd = computeMacd(candles)

    const latest = buildLatest({ candles, rsi, macd, ema20, ema50, ema200 })

    const signal = buildSignal({
      close: latest.close,
      rsi: latest.rsi,
      macd: latest.macd,
      macdSignal: latest.macdSignal,
      ema20: latest.ema20,
      ema50: latest.ema50,
      ema200: latest.ema200,
    })

    return NextResponse.json({
      ok: true,
      symbol,
      interval,
      ema20,
      ema50,
      ema200,
      rsi,
      macd,
      latest,
      signal,
      updatedAt: Date.now(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка расчёта индикаторов'
    console.error('[api/indicators]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
