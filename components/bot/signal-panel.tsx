import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import type { Signal } from "@/lib/db/schema"
import type { StrategyResult } from "@/lib/trading/strategies"
import { Badge } from "@/components/ui/badge"
import { fmtTime } from "@/lib/trading/format"
import { cn } from "@/lib/utils"

const VOTE_UI = {
  1: { icon: ArrowUp, cls: "text-profit bg-profit/10 border-profit/30", label: "Long" },
  0: { icon: Minus, cls: "text-muted-foreground bg-muted/40 border-border", label: "Neutral" },
  [-1]: { icon: ArrowDown, cls: "text-loss bg-loss/10 border-loss/30", label: "Short" },
} as const

export function SignalPanel({ signal }: { signal: Signal | null }) {
  const results = (signal?.details as StrategyResult[] | undefined) ?? []
  const decision = signal?.decision ?? "hold"

  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-4" aria-label="Strategy signals">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Strategy votes</h2>
        <Badge
          variant="outline"
          className={cn(
            "font-mono uppercase",
            decision === "long" && "border-profit/40 text-profit",
            decision === "short" && "border-loss/40 text-loss",
            decision === "hold" && "text-muted-foreground",
          )}
        >
          {decision}
          {signal ? ` · ${signal.score > 0 ? "+" : ""}${signal.score}` : ""}
        </Badge>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {signal ? `Last scan ${fmtTime(signal.createdAt)}` : "No scans yet — turn the bot on"}
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {results.length === 0
          ? ["EMA 9/21 Crossover", "RSI 14", "VWAP Bounce", "Order Book Momentum"].map((n) => (
              <li key={n} className="flex items-center gap-3 rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">
                <span className="flex size-7 items-center justify-center rounded-md border">
                  <Minus className="size-3.5" aria-hidden />
                </span>
                {n}
              </li>
            ))
          : results.map((r) => {
              const ui = VOTE_UI[r.vote]
              const Icon = ui.icon
              return (
                <li key={r.id} className="flex items-start gap-3 rounded-lg border p-2.5">
                  <span
                    className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border", ui.cls)}
                    aria-label={ui.label}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-tight">{r.name}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{r.reason}</p>
                  </div>
                </li>
              )
            })}
      </ul>
    </section>
  )
}
