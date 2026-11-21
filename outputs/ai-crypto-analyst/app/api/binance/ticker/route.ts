import { NextResponse } from 'next/server'
import { fetchTickers } from '@/lib/binance'
import { isSymbolKey, SYMBOLS, type SymbolKey } from '@/lib/market'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const symbolParam = url.searchParams.get('symbol')
    const symbolsParam = url.searchParams.get('symbols')

    let requested: SymbolKey[] = [...SYMBOLS]

    if (symbolParam) {
      const upper = symbolParam.trim().toUpperCase()
      if (!isSymbolKey(upper)) {
        return NextResponse.json(
          { ok: false, error: 'Неподдерживаемый торговый символ' },
          { status: 400 }
        )
      }
      requested = [upper]
    } else if (symbolsParam) {
      const parts = [...new Set(symbolsParam
        .split(',')
        .map((item: string) => item.trim().toUpperCase())
        .filter(isSymbolKey))]
      if (parts.length === 0) {
        return NextResponse.json(
          { ok: false, error: 'Неподдерживаемый торговый символ' },
          { status: 400 }
        )
      }
      requested = parts
    }

    const data = await fetchTickers(requested)

    if (data.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Binance не вернул данные по тикерам' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, data, updatedAt: Date.now() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка Binance'
    console.error('[api/binance/ticker]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
