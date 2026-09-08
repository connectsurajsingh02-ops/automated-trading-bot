import type { Candle, OrderBook } from "./exchange"

export function ema(values: number[], period: number): number[] {
  if (values.length === 0) return []
  const k = 2 / (period + 1)
  const out: number[] = [values[0]]
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k))
  }
  return out
}

export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = new Array(closes.length).fill(50)
  if (closes.length <= period) return out

  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gain += d
    else loss -= d
  }
  let avgGain = gain / period
  let avgLoss = loss / period
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }
  return out
}

export function vwap(candles: Candle[]): number[] {
  let cumPV = 0
  let cumV = 0
  return candles.map((c) => {
    const typical = (c.high + c.low + c.close) / 3
    cumPV += typical * c.volume
    cumV += c.volume
    return cumV === 0 ? typical : cumPV / cumV
  })
}

export function orderBookImbalance(book: OrderBook, levels = 10): number {
  const bidVol = book.bids.slice(0, levels).reduce((s, l) => s + l.size, 0)
  const askVol = book.asks.slice(0, levels).reduce((s, l) => s + l.size, 0)
  const total = bidVol + askVol
  if (total === 0) return 0
  return (bidVol - askVol) / total
}

export function volumeSpike(candles: Candle[], lookback = 20): number {
  if (candles.length < lookback + 1) return 1
  const recent = candles.slice(-lookback - 1, -1)
  const avg = recent.reduce((s, c) => s + c.volume, 0) / recent.length
  const last = candles[candles.length - 1].volume
  return avg === 0 ? 1 : last / avg
}
