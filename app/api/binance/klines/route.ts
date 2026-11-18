import { NextResponse } from 'next/server'
import { fetchKlines } from '@/lib/binance'
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

    if (candles.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Binance не вернул свечные данные' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      symbol,
      interval,
      candles,
      updatedAt: Date.now(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка Binance'
    console.error('[api/binance/klines]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
