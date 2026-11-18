'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LiveStatusProps {
  lastUpdate: number | null
  error?: boolean
  className?: string
  showLabel?: boolean
}

export function LiveStatus({ lastUpdate, error = false, className, showLabel = true }: LiveStatusProps) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const isLive = !error && typeof lastUpdate === 'number' && lastUpdate > 0
  const seconds =
    isLive && now !== null && typeof lastUpdate === 'number'
      ? Math.max(0, Math.floor((now - lastUpdate) / 1000))
      : null

  const label = !isLive
    ? 'нет связи'
    : seconds === null
      ? 'ожидание данных'
      : seconds < 5
        ? 'только что'
        : `${seconds} с назад`

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
        isLive
          ? 'border-up/25 bg-up-soft text-up'
          : 'border-border bg-secondary/60 text-muted-foreground',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={cn(
            'relative inline-flex h-1.5 w-1.5 rounded-full',
            isLive ? 'live-dot bg-up text-up' : 'bg-muted-foreground'
          )}
        />
      </span>
      {showLabel ? (
        <span className="tabular hidden sm:inline">
          {isLive ? 'LIVE' : 'OFFLINE'}
          <span className="ml-1.5 font-normal opacity-70">{label}</span>
        </span>
      ) : null}
    </div>
  )
}
