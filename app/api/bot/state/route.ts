import { NextResponse } from "next/server"
import { desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { signals, trades } from "@/lib/db/schema"
import { getOpenTrade, getSettings } from "@/lib/trading/bot"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [settings, openTrade, recentTrades, latestSignal, stats] =
      await Promise.all([
        getSettings(),
        getOpenTrade(),
        db
          .select()
          .from(trades)
          .where(eq(trades.status, "closed"))
          .orderBy(desc(trades.closedAt))
          .limit(50),
        db.select().from(signals).orderBy(desc(signals.createdAt)).limit(1),
        db
          .select({
            total: sql<number>`count(*)::int`,
            wins: sql<number>`count(*) filter (where ${trades.pnl} > 0)::int`,
            pnl: sql<string>`coalesce(sum(${trades.pnl}), 0)`,
            best: sql<string>`coalesce(max(${trades.pnl}), 0)`,
            worst: sql<string>`coalesce(min(${trades.pnl}), 0)`,
          })
          .from(trades)
          .where(eq(trades.status, "closed")),
      ])

    return NextResponse.json({
      settings,
      openTrade,
      recentTrades,
      latestSignal: latestSignal[0] ?? null,
      stats: {
        total: stats[0]?.total ?? 0,
        wins: stats[0]?.wins ?? 0,
        pnl: Number(stats[0]?.pnl ?? 0),
        best: Number(stats[0]?.best ?? 0),
        worst: Number(stats[0]?.worst ?? 0),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load state"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
