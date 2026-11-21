import type { Metadata } from 'next'
import { MarketDashboard } from '@/components/market-dashboard'

export const metadata: Metadata = {
  title: 'AI Crypto Analyst — панель анализа рынка',
  description:
    'Котировки BTC, ETH и SOL, свечные графики с EMA, RSI и MACD, агрегированный торговый сигнал. Только для образовательных целей.',
}

export default function HomePage() {
  return <MarketDashboard />
}
