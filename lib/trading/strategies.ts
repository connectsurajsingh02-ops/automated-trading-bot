import type { StrategyId } from "@/lib/db/schema"
import type { Candle, OrderBook } from "./exchange"
import { ema, orderBookImbalance, rsi, volumeSpike, vwap } from "./indicators"

export type Vote = 1 | 0 | -1

export interface StrategyResult {
  id: StrategyId
  name: string
  vote: Vote
  reason: string
  metrics: Record<string, number>
}

export interface EngineDecision {
  decision: "long" | "short" | "hold"
  score: number
  results: StrategyResult[]
}

function emaStrategy(candles: Candle[]): StrategyResult {
  const closes = candles.map((c) => c.close)
  const fast = ema(closes, 9)
  const slow = ema(closes, 21)
  const n = closes.length - 1
  const prevDiff = fast[n - 1] - slow[n - 1]
  const diff = fast[n] - slow[n]
  const spreadPct = (diff / slow[n]) * 100

  let vote: Vote = 0
  let reason = "EMA9 and EMA21 flat, no edge"
  if (prevDiff <= 0 && diff > 0) {
    vote = 1
    reason = "EMA9 crossed above EMA21 (bullish cross)"
  } else if (prevDiff >= 0 && diff < 0) {
    vote = -1
    reason = "EMA9 crossed below EMA21 (bearish cross)"
  } else if (diff > 0 && spreadPct > 0.02) {
    vote = 1
    reason = "EMA9 above EMA21, uptrend continuing"
  } else if (diff < 0 && spreadPct < -0.02) {
    vote = -1
    reason = "EMA9 below EMA21, downtrend continuing"
  }
  return {
    id: "ema",
    name: "EMA 9/21 Crossover",
    vote,
    reason,
    metrics: { ema9: fast[n], ema21: slow[n], spreadPct },
  }
}

function rsiStrategy(candles: Candle[]): StrategyResult {
  const closes = candles.map((c) => c.close)
  const r = rsi(closes, 14)
  const value = r[r.length - 1]
  let vote: Vote = 0
  let reason = `RSI ${value.toFixed(1)} in neutral zone`
  if (value < 30) {
    vote = 1
    reason = `RSI ${value.toFixed(1)} oversold, expecting bounce`
  } else if (value > 70) {
    vote = -1
    reason = `RSI ${value.toFixed(1)} overbought, expecting pullback`
  } else if (value < 40) {
    vote = 1
    reason = `RSI ${value.toFixed(1)} leaning oversold`
  } else if (value > 60) {
    vote = -1
    reason = `RSI ${value.toFixed(1)} leaning overbought`
  }
  return { id: "rsi", name: "RSI 14", vote, reason, metrics: { rsi: value } }
}

function vwapStrategy(candles: Candle[]): StrategyResult {
  const v = vwap(candles)
  const n = candles.length - 1
  const price = candles[n].close
  const prev = candles[n - 1]
  const vw = v[n]
  const distPct = ((price - vw) / vw) * 100

  let vote: Vote = 0
  let reason = `Price ${distPct.toFixed(3)}% from VWAP, no bounce`
  const touchedFromAbove = prev.low <= v[n - 1] && price > vw
  const touchedFromBelow = prev.high >= v[n - 1] && price < vw
  if (touchedFromAbove) {
    vote = 1
    reason = "Price bounced off VWAP from above (support)"
  } else if (touchedFromBelow) {
    vote = -1
    reason = "Price rejected at VWAP from below (resistance)"
  } else if (distPct > 0.05) {
    vote = 1
    reason = `Price holding ${distPct.toFixed(3)}% above VWAP`
  } else if (distPct < -0.05) {
    vote = -1
    reason = `Price holding ${Math.abs(distPct).toFixed(3)}% below VWAP`
  }
  return {
    id: "vwap",
    name: "VWAP Bounce",
    vote,
    reason,
    metrics: { vwap: vw, distPct },
  }
}

function orderBookStrategy(candles: Candle[], book: OrderBook): StrategyResult {
  const imbalance = orderBookImbalance(book, 10)
  const spike = volumeSpike(candles, 20)
  let vote: Vote = 0
  let reason = `Book balanced (${(imbalance * 100).toFixed(1)}%), volume ${spike.toFixed(2)}x`
  if (imbalance > 0.2 && spike > 1.2) {
    vote = 1
    reason = `Bid-heavy book (+${(imbalance * 100).toFixed(1)}%) with ${spike.toFixed(2)}x volume`
  } else if (imbalance < -0.2 && spike > 1.2) {
    vote = -1
    reason = `Ask-heavy book (${(imbalance * 100).toFixed(1)}%) with ${spike.toFixed(2)}x volume`
  } else if (imbalance > 0.35) {
    vote = 1
    reason = `Strong bid wall (+${(imbalance * 100).toFixed(1)}%)`
  } else if (imbalance < -0.35) {
    vote = -1
    reason = `Strong ask wall (${(imbalance * 100).toFixed(1)}%)`
  }
  return {
    id: "orderbook",
    name: "Order Book Momentum",
    vote,
    reason,
    metrics: { imbalance, volumeSpike: spike },
  }
}

export function runEngine(
  candles: Candle[],
  book: OrderBook,
  enabled: StrategyId[],
  minConfluence: number,
): EngineDecision {
  if (candles.length < 30) {
    return { decision: "hold", score: 0, results: [] }
  }
  const all: StrategyResult[] = [
    emaStrategy(candles),
    rsiStrategy(candles),
    vwapStrategy(candles),
    orderBookStrategy(candles, book),
  ]
  const results = all.filter((r) => enabled.includes(r.id))
  const score = results.reduce((s, r) => s + r.vote, 0)
  const longs = results.filter((r) => r.vote === 1).length
  const shorts = results.filter((r) => r.vote === -1).length

  let decision: EngineDecision["decision"] = "hold"
  if (longs >= minConfluence && score > 0) decision = "long"
  else if (shorts >= minConfluence && score < 0) decision = "short"

  return { decision, score, results }
}
