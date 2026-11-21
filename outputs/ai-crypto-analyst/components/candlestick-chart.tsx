'use client'

import { useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle, IndicatorPoint, Interval, MacdPoint } from '@/lib/market'

interface ChartHandles {
  chart: IChartApi
  candles: ISeriesApi<'Candlestick'>
  ema20: ISeriesApi<'Line'>
  ema50: ISeriesApi<'Line'>
  ema200: ISeriesApi<'Line'>
  rsi: ISeriesApi<'Line'>
  macdHist: ISeriesApi<'Histogram'>
  macdLine: ISeriesApi<'Line'>
  macdSignal: ISeriesApi<'Line'>
}

export interface CandlestickChartProps {
  candles: Candle[]
  ema20: IndicatorPoint[]
  ema50: IndicatorPoint[]
  ema200: IndicatorPoint[]
  rsi: IndicatorPoint[]
  macd: MacdPoint[]
  interval: Interval
  precision: number
}

const GRID = 'rgba(255,255,255,0.04)'
const AXIS_TEXT = '#7f8a9e'

function toLine(points: IndicatorPoint[] | undefined) {
  const safe = Array.isArray(points) ? points : []
  return safe.map((point: IndicatorPoint) => ({
    time: point.time as UTCTimestamp,
    value: point.value,
  }))
}

export default function CandlestickChart({
  candles,
  ema20,
  ema50,
  ema200,
  rsi,
  macd,
  interval,
  precision,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const handlesRef = useRef<ChartHandles | null>(null)
  const fitKeyRef = useRef<string>('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: AXIS_TEXT,
        fontSize: 11,
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 6,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(148,163,184,0.35)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1b2130',
        },
        horzLine: {
          color: 'rgba(148,163,184,0.35)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1b2130',
        },
      },
      localization: { locale: 'ru-RU' },
    })

    const candleSeries = chart.addSeries(
      CandlestickSeries,
      {
        upColor: '#22c55e',
        downColor: '#f43f5e',
        borderUpColor: '#22c55e',
        borderDownColor: '#f43f5e',
        wickUpColor: 'rgba(34,197,94,0.75)',
        wickDownColor: 'rgba(244,63,94,0.75)',
        priceLineVisible: true,
        priceLineColor: 'rgba(148,163,184,0.5)',
        priceLineStyle: LineStyle.Dotted,
      },
      0
    )

    const ema20Series = chart.addSeries(
      LineSeries,
      {
        color: '#60a5fa',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      },
      0
    )

    const ema50Series = chart.addSeries(
      LineSeries,
      {
        color: '#fb923c',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      },
      0
    )

    const ema200Series = chart.addSeries(
      LineSeries,
      {
        color: '#f87171',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      },
      0
    )

    const rsiSeries = chart.addSeries(
      LineSeries,
      {
        color: '#a78bfa',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
        autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
      },
      1
    )

    rsiSeries.createPriceLine({
      price: 70,
      color: 'rgba(244,63,94,0.45)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: '',
    })
    rsiSeries.createPriceLine({
      price: 30,
      color: 'rgba(34,197,94,0.45)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: '',
    })
    rsiSeries.createPriceLine({
      price: 50,
      color: 'rgba(148,163,184,0.18)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: '',
    })

    const macdHistSeries = chart.addSeries(
      HistogramSeries,
      {
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      },
      2
    )

    const macdLineSeries = chart.addSeries(
      LineSeries,
      {
        color: '#60a5fa',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      },
      2
    )

    const macdSignalSeries = chart.addSeries(
      LineSeries,
      {
        color: '#fb923c',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      },
      2
    )

    const panes = chart.panes()
    if (panes.length >= 3) {
      panes[0]?.setStretchFactor(0.56)
      panes[1]?.setStretchFactor(0.2)
      panes[2]?.setStretchFactor(0.24)
    }

    handlesRef.current = {
      chart,
      candles: candleSeries,
      ema20: ema20Series,
      ema50: ema50Series,
      ema200: ema200Series,
      rsi: rsiSeries,
      macdHist: macdHistSeries,
      macdLine: macdLineSeries,
      macdSignal: macdSignalSeries,
    }

    return () => {
      handlesRef.current = null
      fitKeyRef.current = ''
      chart.remove()
    }
  }, [])

  useEffect(() => {
    const handles = handlesRef.current
    if (!handles) return

    const safeCandles = Array.isArray(candles) ? candles : []
    if (safeCandles.length === 0) return

    const safePrecision = Number.isFinite(precision) ? precision : 2

    handles.candles.applyOptions({
      priceFormat: { type: 'price', precision: safePrecision, minMove: 10 ** -safePrecision },
    })
    handles.chart.applyOptions({
      timeScale: { timeVisible: interval !== '1d', secondsVisible: false },
    })

    handles.candles.setData(
      safeCandles.map((candle: Candle) => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
    )

    handles.ema20.setData(toLine(ema20))
    handles.ema50.setData(toLine(ema50))
    handles.ema200.setData(toLine(ema200))
    handles.rsi.setData(toLine(rsi))

    const safeMacd = Array.isArray(macd) ? macd : []
    handles.macdHist.setData(
      safeMacd.map((point: MacdPoint) => ({
        time: point.time as UTCTimestamp,
        value: point.histogram,
        color: point.histogram >= 0 ? 'rgba(34,197,94,0.65)' : 'rgba(244,63,94,0.65)',
      }))
    )
    handles.macdLine.setData(
      safeMacd.map((point: MacdPoint) => ({ time: point.time as UTCTimestamp, value: point.macd }))
    )
    handles.macdSignal.setData(
      safeMacd.map((point: MacdPoint) => ({ time: point.time as UTCTimestamp, value: point.signal }))
    )

    const fitKey = `${safeCandles[0]?.time ?? 0}-${interval}`
    if (fitKeyRef.current !== fitKey) {
      fitKeyRef.current = fitKey
      handles.chart.timeScale().fitContent()
    }
  }, [candles, ema20, ema50, ema200, rsi, macd, interval, precision])

  return <div ref={containerRef} className="h-full w-full" />
}
