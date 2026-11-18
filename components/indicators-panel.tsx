'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Gauge,
  Minus,
  TrendingDown,
  TrendingUp,
  Waves,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import type { IndicatorsResponse, Interval, SignalDirection } from '@/lib/market'
import { INTERVAL_LABELS } from '@/lib/market'

interface IndicatorsPanelProps {
  data: IndicatorsResponse | null
  loading: boolean
  error: string | null
  timeframe: Interval
  onRetry: () => void
}

function directionTone(direction: SignalDirection) {
  if (direction === 'BUY') return { text: 'text-up', bg: 'bg-up-soft', border: 'border-up/30', dot: 'bg-up' }
  if (direction === 'SELL') return { text: 'text-down', bg: 'bg-down-soft', border: 'border-down/30', dot: 'bg-down' }
  return { text: 'text-warn', bg: 'bg-warn-soft', border: 'border-warn/30', dot: 'bg-warn' }
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn('tabular font-mono text-[11px] font-medium', tone ?? 'text-foreground/90')}>{value}</span>
    </div>
  )
}

function PanelShell({
  icon,
  title,
  badge,
  children,
}: {
  icon: ReactNode
  title: string
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-[11px] font-medium uppercase tracking-wider">{title}</span>
        </div>
        {badge}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function SkeletonPanel() {
  return (
    <div className="panel p-4">
      <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
      <div className="mt-4 h-7 w-32 animate-pulse rounded bg-secondary" />
      <div className="mt-3 h-2 w-full animate-pulse rounded bg-secondary" />
      <div className="mt-3 h-3 w-40 animate-pulse rounded bg-secondary" />
    </div>
  )
}

export function IndicatorsPanel({ data, loading, error, timeframe, onRetry }: IndicatorsPanelProps) {
  if (!data && loading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonPanel />
        <SkeletonPanel />
        <SkeletonPanel />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="panel flex flex-col items-start gap-3 p-5">
        <div className="flex items-center gap-2 text-down">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Индикаторы недоступны</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {error ?? 'Не удалось получить данные для расчёта индикаторов.'}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          Повторить запрос
        </button>
      </div>
    )
  }

  const { latest, signal } = data
  const tone = directionTone(signal?.direction ?? 'NEUTRAL')
  const DirectionIcon =
    signal?.direction === 'BUY' ? TrendingUp : signal?.direction === 'SELL' ? TrendingDown : Minus

  const rsiValue = latest?.rsi ?? 0
  const rsiZone = latest?.rsiZone ?? 'neutral'
  const rsiLabel = rsiZone === 'oversold' ? 'Перепродан' : rsiZone === 'overbought' ? 'Перекуплен' : 'Нейтрально'
  const rsiTone =
    rsiZone === 'oversold'
      ? 'bg-up-soft text-up border-up/30'
      : rsiZone === 'overbought'
        ? 'bg-down-soft text-down border-down/30'
        : 'bg-warn-soft text-warn border-warn/30'

  const histogram = latest?.macdHistogram ?? 0
  const macdUp = histogram >= 0

  const priceVsEma200 = latest?.priceVsEma200 ?? 0
  const aboveEma200 = priceVsEma200 >= 0

  return (
    <div className="flex flex-col gap-3">
      {/* Агрегированный сигнал */}
      <div className={cn('panel relative overflow-hidden p-4', tone.border)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Сигнал</span>
          </div>
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', tone.bg, tone.text, tone.border)}>
            {signal?.strengthLabel ?? 'Нет сигнала'}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className={cn('flex items-center gap-2 font-display text-2xl font-semibold tracking-tight', tone.text)}>
            <DirectionIcon className="h-5 w-5" strokeWidth={2.5} />
            {signal?.label ?? 'НЕЙТРАЛЬНО'}
          </div>
          <div className="text-right leading-none">
            <div className="tabular font-mono text-2xl font-semibold">{signal?.score ?? 50}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">score / 100</div>
          </div>
        </div>

        <div className="relative mt-4 h-1.5 w-full rounded-full bg-gradient-to-r from-down/70 via-warn/60 to-up/80">
          <motion.span
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
            initial={{ left: '50%' }}
            animate={{ left: `calc(${Math.max(0, Math.min(100, signal?.score ?? 50))}% - 6px)` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-wide text-muted-foreground/70">
          <span>Продажа</span>
          <span>Нейтрально</span>
          <span>Покупка</span>
        </div>

        <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
          {(signal?.components ?? []).map((component) => {
            const componentTone = directionTone(component?.verdict ?? 'NEUTRAL')
            return (
              <div key={component?.key} className="flex items-start gap-2">
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', componentTone.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-medium text-foreground/90">{component?.label}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">вес {component?.weight}%</span>
                  </div>
                  <p className="text-[10px] leading-snug text-muted-foreground">{component?.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* RSI */}
      <PanelShell
        icon={<Activity className="h-3.5 w-3.5" />}
        title="RSI 14"
        badge={<span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', rsiTone)}>{rsiLabel}</span>}
      >
        <div className="flex items-end justify-between">
          <span className="tabular font-mono text-2xl font-semibold leading-none">{formatPrice(rsiValue, 1)}</span>
          <span className="text-[10px] text-muted-foreground">{INTERVAL_LABELS[timeframe]}</span>
        </div>
        <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full">
          <div className="absolute inset-y-0 left-0 w-[30%] bg-up/55" />
          <div className="absolute inset-y-0 left-[30%] w-[40%] bg-warn/45" />
          <div className="absolute inset-y-0 left-[70%] w-[30%] bg-down/55" />
          <motion.span
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-background bg-foreground"
            initial={{ left: '50%' }}
            animate={{ left: `calc(${Math.max(0, Math.min(100, rsiValue))}% - 5px)` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-muted-foreground/70">
          <span>0</span>
          <span>30</span>
          <span>70</span>
          <span>100</span>
        </div>
      </PanelShell>

      {/* MACD */}
      <PanelShell
        icon={<Waves className="h-3.5 w-3.5" />}
        title="MACD 12·26·9"
        badge={
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
              macdUp ? 'border-up/30 bg-up-soft text-up' : 'border-down/30 bg-down-soft text-down'
            )}
          >
            {macdUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {macdUp ? 'вверх' : 'вниз'}
          </span>
        }
      >
        <Row label="MACD" value={formatPrice(latest?.macd ?? 0, 2)} />
        <Row label="Signal" value={formatPrice(latest?.macdSignal ?? 0, 2)} />
        <Row
          label="Histogram"
          value={formatPrice(histogram, 2)}
          tone={macdUp ? 'text-up' : 'text-down'}
        />
      </PanelShell>

      {/* EMA */}
      <PanelShell
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        title="EMA 20 · 50 · 200"
        badge={
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium',
              aboveEma200 ? 'border-up/30 bg-up-soft text-up' : 'border-down/30 bg-down-soft text-down'
            )}
          >
            {aboveEma200 ? 'бычий тренд' : 'медвежий тренд'}
          </span>
        }
      >
        <Row label="EMA 20" value={formatPrice(latest?.ema20 ?? 0, 2)} tone="text-[#60a5fa]" />
        <Row label="EMA 50" value={formatPrice(latest?.ema50 ?? 0, 2)} tone="text-[#fb923c]" />
        <Row label="EMA 200" value={formatPrice(latest?.ema200 ?? 0, 2)} tone="text-[#f87171]" />
        <div className="mt-2 flex items-center justify-between rounded-md bg-secondary/50 px-2 py-1.5">
          <span className="text-[10px] text-muted-foreground">Цена к EMA200</span>
          <span className={cn('tabular font-mono text-[11px] font-medium', aboveEma200 ? 'text-up' : 'text-down')}>
            {aboveEma200 ? '+' : '\u2212'}
            {formatPrice(Math.abs(priceVsEma200), 2)}%
          </span>
        </div>
      </PanelShell>
    </div>
  )
}
