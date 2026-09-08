"use client"

import { ArrowDownRight, ArrowUpRight, X } from "lucide-react"
import type { Trade } from "@/lib/db/schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fmtMoney, fmtPct, fmtPrice, fmtTime, pnlClass } from "@/lib/trading/format"
import { cn } from "@/lib/utils"

interface Props {
  trade: Trade | null
  price?: number
  onClose: () => void
}

export function PositionCard({ trade, price, onClose }: Props) {
  if (!trade) {
    return (
      <section
        className="flex min-h-24 items-center justify-center rounded-xl border border-dashed bg-card/50 p-4 text-sm text-muted-foreground"
        aria-label="Open position"
      >
        No open position — waiting for signal confluence
      </section>
    )
  }

  const entry = Number(trade.entryPrice)
  const qty = Number(trade.quantity)
  const notional = Number(trade.notional)
  const tp = Number(trade.takeProfit)
  const sl = Number(trade.stopLoss)
  const cur = price ?? entry
  const gross = trade.side === "long" ? (cur - entry) * qty : (entry - cur) * qty
  const pct = (gross / notional) * 100
  const isLong = trade.side === "long"

  const span = Math.abs(tp - sl) || 1
  const progress = Math.min(100, Math.max(0, ((isLong ? cur - sl : sl - cur) / span) * 100))

  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Open position">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "gap-1 font-mono uppercase",
              isLong ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss",
            )}
            variant="outline"
          >
            {isLong ? <ArrowUpRight className="size-3" aria-hidden /> : <ArrowDownRight className="size-3" aria-hidden />}
            {trade.side}
          </Badge>
          <span className="text-sm font-medium">{trade.symbol}</span>
          <span className="text-xs text-muted-foreground">since {fmtTime(trade.openedAt)}</span>
        </div>
        <div className="text-right">
          <p className={cn("font-mono text-lg font-semibold tabular-nums", pnlClass(gross))}>
            {fmtMoney(gross)}
          </p>
          <p className={cn("font-mono text-xs tabular-nums", pnlClass(pct))}>{fmtPct(pct, 3)}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs tabular-nums sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Entry</dt>
          <dd>{fmtPrice(entry)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Size</dt>
          <dd>${notional.toFixed(0)}</dd>
        </div>
        <div>
          <dt className="text-loss/90">Stop</dt>
          <dd>{fmtPrice(sl)}</dd>
        </div>
        <div>
          <dt className="text-profit/90">Target</dt>
          <dd>{fmtPrice(tp)}</dd>
        </div>
      </dl>

      <div className="mt-3">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-loss via-warning to-profit"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>SL</span>
          <span>{trade.entryReason}</span>
          <span>TP</span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-full gap-1.5"
        onClick={onClose}
      >
        <X className="size-3.5" aria-hidden /> Close at market
      </Button>
    </section>
  )
}
