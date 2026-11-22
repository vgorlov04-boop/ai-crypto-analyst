'use client'

import { ChartCandlestick, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { LiveStatus } from '@/components/live-status'

interface SiteHeaderProps {
  lastUpdate: number | null
  hasError: boolean
  refreshing: boolean
  onRefresh: () => void
}

export function SiteHeader({ lastUpdate, hasError, refreshing, onRefresh }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mobile-site-header-inner mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/55 text-primary-foreground shadow-sm">
            <ChartCandlestick className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-sm font-semibold tracking-tight">AI Crypto Analyst</div>
            <div className="hidden text-[10px] text-muted-foreground sm:block">Технический анализ · Этап 1</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LiveStatus lastUpdate={lastUpdate} error={hasError} />
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            loading={refreshing}
            className="hidden sm:inline-flex"
          >
            <RefreshCw />
            Обновить
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRefresh}
            aria-label="Обновить данные"
            className="mobile-refresh-button sm:hidden"
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
