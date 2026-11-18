// Deterministic number formatting helpers (explicit locale -> SSR safe).

const LOCALE = 'ru-RU'

export function formatPrice(value: number | null | undefined, digits = 2): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
  try {
    return new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(safe)
  } catch {
    return safe.toFixed(digits)
  }
}

export function formatSigned(value: number | null | undefined, digits = 2): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
  const sign = safe > 0 ? '+' : safe < 0 ? '\u2212' : ''
  return `${sign}${formatPrice(Math.abs(safe), digits)}`
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
  const sign = safe > 0 ? '+' : safe < 0 ? '\u2212' : ''
  return `${sign}${formatPrice(Math.abs(safe), digits)}%`
}

export function formatCompact(value: number | null | undefined): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
  const abs = Math.abs(safe)
  const sign = safe < 0 ? '\u2212' : ''
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)} млрд`
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)} млн`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2)} тыс`
  return `${sign}${abs.toFixed(2)}`
}

export function formatTime(ms: number | null | undefined): string {
  const safe = typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : 0
  if (!safe) return '\u2014'
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Warsaw',
    }).format(new Date(safe))
  } catch {
    return '\u2014'
  }
}

export function formatDateTime(ms: number | null | undefined): string {
  const safe = typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : 0
  if (!safe) return '\u2014'
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw',
    }).format(new Date(safe))
  } catch {
    return '\u2014'
  }
}
