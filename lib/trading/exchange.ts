const DELTA_BASE = "https://api.india.delta.exchange/v2"

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OrderBookLevel {
  price: number
  size: number
}

export interface OrderBook {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
}

export interface Ticker {
  symbol: string
  price: number
  markPrice: number
  high24h: number
  low24h: number
  change24hPct: number
  volume24h: number
}

async function deltaGet<T>(path: string): Promise<T> {
  const res = await fetch(`${DELTA_BASE}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`Delta API ${res.status} on ${path}`)
  const json = (await res.json()) as { success: boolean; result: T }
  if (!json.success) throw new Error(`Delta API returned failure on ${path}`)
  return json.result
}

export async function fetchTicker(symbol: string): Promise<Ticker> {
  const r = await deltaGet<{
    symbol: string
    close: number
    mark_price: string
    high: number
    low: number
    open: number
    turnover_usd: number
  }>(`/tickers/${symbol}`)
  const price = Number(r.close)
  const open = Number(r.open)
  return {
    symbol: r.symbol,
    price,
    markPrice: Number(r.mark_price),
    high24h: Number(r.high),
    low24h: Number(r.low),
    change24hPct: open ? ((price - open) / open) * 100 : 0,
    volume24h: Number(r.turnover_usd ?? 0),
  }
}

export async function fetchCandles(
  symbol: string,
  minutes = 120,
): Promise<Candle[]> {
  const end = Math.floor(Date.now() / 1000)
  const start = end - minutes * 60
  const r = await deltaGet<Candle[]>(
    `/history/candles?symbol=${symbol}&resolution=1m&start=${start}&end=${end}`,
  )
  return [...r]
    .map((c) => ({
      time: Number(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
    }))
    .sort((a, b) => a.time - b.time)
}

export async function fetchOrderBook(
  symbol: string,
  depth = 20,
): Promise<OrderBook> {
  const r = await deltaGet<{
    buy: { price: string; size: number }[]
    sell: { price: string; size: number }[]
  }>(`/l2orderbook/${symbol}?depth=${depth}`)
  return {
    bids: r.buy.map((l) => ({ price: Number(l.price), size: Number(l.size) })),
    asks: r.sell.map((l) => ({ price: Number(l.price), size: Number(l.size) })),
  }
}

export async function fetchMarketSnapshot(symbol: string) {
  const [ticker, candles, orderBook] = await Promise.all([
    fetchTicker(symbol),
    fetchCandles(symbol),
    fetchOrderBook(symbol),
  ])
  return { ticker, candles, orderBook }
}

export const SUPPORTED_SYMBOLS = ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD"] as const
