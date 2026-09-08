import { and, desc, eq, gte, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { botSettings, signals, trades, type BotSettings, type Trade } from "@/lib/db/schema"
import { fetchMarketSnapshot, type Ticker } from "./exchange"
import { runEngine, type EngineDecision } from "./strategies"

// Simulated round-trip cost (maker/taker + slippage) applied on every paper trade.
const FEE_PCT = 0.05

export interface TickResult {
  ticker: Ticker
  decision: EngineDecision
  action: string
  openTrade: Trade | null
  settings: BotSettings
  haltedReason: string | null
}

export async function getSettings(): Promise<BotSettings> {
  const [row] = await db.select().from(botSettings).where(eq(botSettings.id, 1))
  if (!row) throw new Error("bot_settings row missing")
  return row
}

export async function getOpenTrade(): Promise<Trade | null> {
  const [row] = await db
    .select()
    .from(trades)
    .where(eq(trades.status, "open"))
    .orderBy(desc(trades.openedAt))
    .limit(1)
  return row ?? null
}

async function todayRealizedPnl(): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${trades.pnl}), 0)` })
    .from(trades)
    .where(and(eq(trades.status, "closed"), gte(trades.closedAt, startOfDay)))
  return Number(row?.total ?? 0)
}

function computeExit(trade: Trade, price: number) {
  const entry = Number(trade.entryPrice)
  const qty = Number(trade.quantity)
  const notional = Number(trade.notional)
  const gross =
    trade.side === "long" ? (price - entry) * qty : (entry - price) * qty
  const fee = notional * (FEE_PCT / 100)
  const pnl = gross - fee
  return { pnl, pnlPct: (pnl / notional) * 100 }
}

export async function closeTrade(
  trade: Trade,
  price: number,
  reason: string,
): Promise<Trade> {
  const { pnl, pnlPct } = computeExit(trade, price)
  const [closed] = await db
    .update(trades)
    .set({
      status: "closed",
      exitPrice: price.toFixed(4),
      pnl: pnl.toFixed(4),
      pnlPct: pnlPct.toFixed(4),
      exitReason: reason,
      closedAt: new Date(),
    })
    .where(eq(trades.id, trade.id))
    .returning()

  await db
    .update(botSettings)
    .set({
      balance: sql`${botSettings.balance} + ${pnl.toFixed(2)}`,
      updatedAt: new Date(),
    })
    .where(eq(botSettings.id, 1))

  return closed
}

async function openTrade(
  settings: BotSettings,
  side: "long" | "short",
  price: number,
  decision: EngineDecision,
): Promise<Trade> {
  const balance = Number(settings.balance)
  const notional = balance * (Number(settings.tradeSizePct) / 100)
  const qty = notional / price
  const tp = Number(settings.takeProfitPct) / 100
  const slp = Number(settings.stopLossPct) / 100
  const takeProfit = side === "long" ? price * (1 + tp) : price * (1 - tp)
  const stopLoss = side === "long" ? price * (1 - slp) : price * (1 + slp)
  const reasons = decision.results
    .filter((r) => (side === "long" ? r.vote === 1 : r.vote === -1))
    .map((r) => r.name)
    .join(" + ")

  const [trade] = await db
    .insert(trades)
    .values({
      symbol: settings.symbol,
      side,
      status: "open",
      entryPrice: price.toFixed(4),
      quantity: qty.toFixed(8),
      notional: notional.toFixed(2),
      takeProfit: takeProfit.toFixed(4),
      stopLoss: stopLoss.toFixed(4),
      entryReason: reasons,
      signals: decision.results,
    })
    .returning()
  return trade
}

export async function runTick(): Promise<TickResult> {
  const settings = await getSettings()
  const { ticker, candles, orderBook } = await fetchMarketSnapshot(settings.symbol)
  const price = ticker.price

  const decision = runEngine(
    candles,
    orderBook,
    settings.strategies,
    settings.minConfluence,
  )

  await db.insert(signals).values({
    symbol: settings.symbol,
    price: price.toFixed(4),
    decision: decision.decision,
    score: decision.score,
    details: decision.results,
  })

  let action = "Holding, waiting for confluence"
  let haltedReason: string | null = null
  let open = await getOpenTrade()

  if (open && open.symbol !== settings.symbol) {
    open = await closeTrade(open, Number(open.entryPrice), "Symbol changed")
    action = "Closed position because symbol changed"
    open = null
  }

  if (open) {
    const tp = Number(open.takeProfit)
    const slp = Number(open.stopLoss)
    const hitTp = open.side === "long" ? price >= tp : price <= tp
    const hitSl = open.side === "long" ? price <= slp : price >= slp
    const flipped =
      (open.side === "long" && decision.decision === "short") ||
      (open.side === "short" && decision.decision === "long")

    if (hitTp) {
      await closeTrade(open, price, "Take profit hit")
      action = `Take profit hit on ${open.side} at ${price}`
      open = null
    } else if (hitSl) {
      await closeTrade(open, price, "Stop loss hit")
      action = `Stop loss hit on ${open.side} at ${price}`
      open = null
    } else if (flipped) {
      await closeTrade(open, price, "Signal reversed")
      action = `Signal reversed, closed ${open.side} at ${price}`
      open = null
    } else {
      action = `Managing open ${open.side}: TP ${tp.toFixed(1)} / SL ${slp.toFixed(1)}`
    }
  }

  if (!open && settings.isRunning && decision.decision !== "hold") {
    const dailyPnl = await todayRealizedPnl()
    const maxLoss =
      Number(settings.startingBalance) * (Number(settings.maxDailyLossPct) / 100)
    if (dailyPnl <= -maxLoss) {
      haltedReason = `Daily loss limit reached (${dailyPnl.toFixed(2)})`
      await db
        .update(botSettings)
        .set({ isRunning: false, updatedAt: new Date() })
        .where(eq(botSettings.id, 1))
      action = haltedReason
    } else {
      open = await openTrade(settings, decision.decision, price, decision)
      action = `Opened ${decision.decision} at ${price} (score ${decision.score})`
    }
  }

  await db
    .update(botSettings)
    .set({ lastTickAt: new Date() })
    .where(eq(botSettings.id, 1))

  const fresh = await getSettings()
  return { ticker, decision, action, openTrade: open, settings: fresh, haltedReason }
}
