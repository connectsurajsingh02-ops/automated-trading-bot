import type { BotState } from "./dashboard"
import { fmtMoney, fmtPct, pnlClass } from "@/lib/trading/format"
import { cn } from "@/lib/utils"

export function StatsRow({ state }: { state?: BotState }) {
  const balance = Number(state?.settings.balance ?? 0)
  const start = Number(state?.settings.startingBalance ?? 0)
  const totalPnl = state?.stats.pnl ?? 0
  const totalPct = start ? (totalPnl / start) * 100 : 0
  const winRate = state && state.stats.total > 0
    ? (state.stats.wins / state.stats.total) * 100
    : null

  const items = [
    {
      label: "Balance",
      value: state ? `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—",
      sub: state ? `start $${start.toLocaleString("en-US")}` : "",
      cls: "",
    },
    {
      label: "Realized P&L",
      value: state ? fmtMoney(totalPnl) : "—",
      sub: state ? fmtPct(totalPct) : "",
      cls: pnlClass(totalPnl),
    },
    {
      label: "Win rate",
      value: winRate === null ? "—" : `${winRate.toFixed(0)}%`,
      sub: state ? `${state.stats.wins}/${state.stats.total} trades` : "",
      cls: winRate === null ? "" : winRate >= 50 ? "text-profit" : "text-loss",
    },
    {
      label: "Best / Worst",
      value: state ? fmtMoney(state.stats.best) : "—",
      sub: state ? fmtMoney(state.stats.worst) : "",
      cls: "text-profit",
      subCls: "text-loss",
    },
  ]

  return (
    <section
      aria-label="Account summary"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border bg-card px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {it.label}
          </p>
          <p className={cn("mt-0.5 font-mono text-lg tabular-nums font-semibold", it.cls)}>
            {it.value}
          </p>
          <p className={cn("font-mono text-xs tabular-nums text-muted-foreground", it.subCls)}>
            {it.sub || "\u00a0"}
          </p>
        </div>
      ))}
    </section>
  )
}
