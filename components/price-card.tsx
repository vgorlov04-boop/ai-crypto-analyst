'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bitcoin,
  Gem,
  Minus,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCompact, formatPercent, formatPrice, formatSigned } from '@/lib/format'
import { pricePrecision, type SymbolKey, type SymbolMeta, type TickerData } from '@/lib/market'

const ICONS: Partial<Record<SymbolKey, LucideIcon>> = {
  BTCUSDT: Bitcoin,
  ETHUSDT: Gem,
  SOLUSDT: Sun,
}

interface PriceCardProps {
  meta: SymbolMeta
  ticker: TickerData | null
  active: boolean
  onSelect: (symbol: SymbolKey) => void
}

export function PriceCard({ meta, ticker, active, onSelect }: PriceCardProps) {
  const Icon = ICONS[meta.symbol] ?? Bitcoin
  const price = ticker?.price ?? 0
  const changePercent = ticker?.changePercent ?? 0
  const change = ticker?.change ?? 0
  const isUp = changePercent > 0
  const isFlat = changePercent === 0
  const digits = pricePrecision(price)

  const previousPrice = useRef<number>(0)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (!price) return
    const previous = previousPrice.current
    previousPrice.current = price
    if (!previous || previous === price) return
    setFlash(price > previous ? 'up' : 'down')
    const timer = window.setTimeout(() => setFlash(null), 900)
    return () => window.clearTimeout(timer)
  }, [price])

  const TrendIcon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(meta.symbol)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      aria-pressed={active}
      aria-label={`Открыть анализ ${meta.base}`}
      className={cn(
        'panel group relative w-full overflow-hidden p-4 text-left transition-colors duration-normal sm:p-5',
        active ? 'border-primary/45' : 'hover:border-border/90 hover:bg-card/80'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent transition-opacity duration-normal',
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
        )}
      />

      <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-secondary/70"
            style={{ color: meta.accent }}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="font-display text-sm font-semibold tracking-tight">{meta.base}</div>
            <div className="truncate text-[11px] text-muted-foreground">{meta.name}</div>
          </div>
        </div>
        <span
          className={cn(
            'mobile-coin-status rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors',
            active ? 'bg-primary/15 text-primary' : 'bg-secondary/70 text-muted-foreground'
          )}
        >
          {active ? 'выбрано' : 'USDT'}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className={cn(
            'mobile-price-value tabular font-mono text-[26px] font-semibold leading-none tracking-tight sm:text-[28px]',
            flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''
          )}
        >
          {ticker ? formatPrice(price, digits) : '—'}
        </span>
        <span className="mobile-price-unit whitespace-nowrap text-[11px] text-muted-foreground">USDT</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular',
            isFlat ? 'bg-secondary text-muted-foreground' : isUp ? 'bg-up-soft text-up' : 'bg-down-soft text-down'
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          {ticker ? formatPercent(changePercent) : '—'}
        </span>
        <span className={cn('text-xs tabular', isUp ? 'text-up/80' : isFlat ? 'text-muted-foreground' : 'text-down/80')}>
          {ticker ? formatSigned(change, digits) : '—'}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">за 24ч</span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Объём</dt>
          <dd className="tabular mt-0.5 font-mono text-[11px] text-foreground/90">
            {ticker ? formatCompact(ticker.quoteVolume) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Мин 24ч</dt>
          <dd className="tabular mt-0.5 font-mono text-[11px] text-foreground/90">
            {ticker ? formatPrice(ticker.low, digits) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Макс 24ч</dt>
          <dd className="tabular mt-0.5 font-mono text-[11px] text-foreground/90">
            {ticker ? formatPrice(ticker.high, digits) : '—'}
          </dd>
        </div>
      </dl>
    </motion.button>
  )
}
