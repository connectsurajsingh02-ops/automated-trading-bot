import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { botSettings, type StrategyId } from "@/lib/db/schema"
import { SUPPORTED_SYMBOLS } from "@/lib/trading/exchange"
import { closeTrade, getOpenTrade } from "@/lib/trading/bot"
import { fetchTicker } from "@/lib/trading/exchange"

export const dynamic = "force-dynamic"

const STRATEGY_IDS: StrategyId[] = ["ema", "rsi", "vwap", "orderbook"]

function clamp(n: unknown, min: number, max: number, fallback: number) {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(max, Math.max(min, v))
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Record<string, unknown>
  const patch: Partial<typeof botSettings.$inferInsert> = { updatedAt: new Date() }

  if (typeof body.isRunning === "boolean") patch.isRunning = body.isRunning
  if (
    typeof body.symbol === "string" &&
    (SUPPORTED_SYMBOLS as readonly string[]).includes(body.symbol)
  ) {
    patch.symbol = body.symbol
  }
  if (body.tradeSizePct !== undefined)
    patch.tradeSizePct = clamp(body.tradeSizePct, 1, 100, 10).toFixed(2)
  if (body.takeProfitPct !== undefined)
    patch.takeProfitPct = clamp(body.takeProfitPct, 0.02, 5, 0.15).toFixed(3)
  if (body.stopLossPct !== undefined)
    patch.stopLossPct = clamp(body.stopLossPct, 0.02, 5, 0.1).toFixed(3)
  if (body.maxDailyLossPct !== undefined)
    patch.maxDailyLossPct = clamp(body.maxDailyLossPct, 0.5, 50, 3).toFixed(2)
  if (body.minConfluence !== undefined)
    patch.minConfluence = Math.round(clamp(body.minConfluence, 1, 4, 2))
  if (Array.isArray(body.strategies)) {
    const clean = body.strategies.filter((s): s is StrategyId =>
      STRATEGY_IDS.includes(s as StrategyId),
    )
    if (clean.length > 0) patch.strategies = clean
  }

  const [updated] = await db
    .update(botSettings)
    .set(patch)
    .where(eq(botSettings.id, 1))
    .returning()
  return NextResponse.json(updated)
}

export async function POST(req: Request) {
  const { action } = (await req.json()) as { action: string }

  if (action === "close_position") {
    const open = await getOpenTrade()
    if (!open) return NextResponse.json({ closed: null })
    const ticker = await fetchTicker(open.symbol)
    const closed = await closeTrade(open, ticker.price, "Manual close")
    return NextResponse.json({ closed })
  }

  if (action === "reset_paper") {
    const [s] = await db.select().from(botSettings).where(eq(botSettings.id, 1))
    await db.execute(`DELETE FROM trades`)
    await db.execute(`DELETE FROM signals`)
    const [updated] = await db
      .update(botSettings)
      .set({
        balance: s.startingBalance,
        isRunning: false,
        lastTickAt: null,
        updatedAt: new Date(),
      })
      .where(eq(botSettings.id, 1))
      .returning()
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
