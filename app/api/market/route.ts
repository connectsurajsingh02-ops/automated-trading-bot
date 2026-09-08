import { NextResponse } from "next/server"
import { fetchCandles, fetchTicker, SUPPORTED_SYMBOLS } from "@/lib/trading/exchange"
import { ema, vwap } from "@/lib/trading/indicators"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const symbol = url.searchParams.get("symbol") ?? "BTCUSD"
  if (!(SUPPORTED_SYMBOLS as readonly string[]).includes(symbol)) {
    return NextResponse.json({ error: "Unsupported symbol" }, { status: 400 })
  }
  try {
    const [ticker, candles] = await Promise.all([
      fetchTicker(symbol),
      fetchCandles(symbol, 90),
    ])
    const closes = candles.map((c) => c.close)
    const ema9 = ema(closes, 9)
    const ema21 = ema(closes, 21)
    const vw = vwap(candles)
    const series = candles.map((c, i) => ({
      time: c.time,
      close: c.close,
      ema9: ema9[i],
      ema21: ema21[i],
      vwap: vw[i],
    }))
    return NextResponse.json({ ticker, series })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Market fetch failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
