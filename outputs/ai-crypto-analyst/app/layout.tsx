import type { Metadata, Viewport } from 'next'
import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: 'AI Crypto Analyst — технический анализ BTC, ETH, SOL',
  description:
    'Образовательный инструмент: живые котировки Binance, свечные графики, RSI, MACD, EMA и агрегированные торговые сигналы по BTC, ETH и SOL.',
  manifest: '/manifest.webmanifest',
  applicationName: 'AI Crypto Analyst',
  appleWebApp: {
    capable: true,
    title: 'AI Crypto Analyst',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'AI Crypto Analyst',
    description:
      'Живые котировки, свечи и технические индикаторы BTC, ETH и SOL с агрегированной оценкой сигнала.',
    type: 'website',
    locale: 'ru_RU',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AI Crypto Analyst' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Crypto Analyst',
    description: 'Технический анализ BTC, ETH и SOL в реальном времени.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#06070a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" />
      </head>
      <body className={`${dmSans.variable} ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          {/* IMPORTANT: Do not remove — handles chunk loading race conditions in the dev server */}
          <ChunkLoadErrorHandler />
        </ThemeProvider>
      </body>
    </html>
  )
}
