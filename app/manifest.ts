import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI Crypto Analyst',
    short_name: 'Crypto Analyst',
    description:
      'Образовательный инструмент: живые котировки Binance, свечные графики, RSI, MACD, EMA и торговые сигналы по BTC, ETH и SOL.',
    start_url: '/',
    display: 'standalone',
    background_color: '#06070a',
    theme_color: '#06070a',
    lang: 'ru',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
