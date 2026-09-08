import type { Trade } from "@/lib/db/schema"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fmtMoney, fmtPct, fmtPrice, fmtTime, pnlClass } from "@/lib/trading/format"
import { cn } from "@/lib/utils"

export function TradeLog({ trades }: { trades: Trade[] }) {
  return (
    <section className="rounded-xl border bg-card" aria-label="Closed trades">
      <ScrollArea className="h-56">
        {trades.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">No closed trades yet.</p>
        ) : (
          <table className="w-full font-mono text-xs tabular-nums">
            <thead className="sticky top-0 bg-card text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-2 py-2 font-medium">Side</th>
                <th className="px-2 py-2 font-medium text-right">Entry</th>
                <th className="px-2 py-2 font-medium text-right">Exit</th>
                <th className="px-2 py-2 font-medium text-right">P&L</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {trades.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-1.5 text-muted-foreground">{fmtTime(t.closedAt)}</td>
                  <td className={cn("px-2 py-1.5 uppercase", t.side === "long" ? "text-profit" : "text-loss")}>
                    {t.side}
                  </td>
                  <td className="px-2 py-1.5 text-right">{fmtPrice(t.entryPrice)}</td>
                  <td className="px-2 py-1.5 text-right">{fmtPrice(t.exitPrice)}</td>
                  <td className={cn("px-2 py-1.5 text-right", pnlClass(t.pnl))}>
                    {fmtMoney(t.pnl)}
                    <span className="ml-1 text-[10px] opacity-70">{fmtPct(t.pnlPct)}</span>
                  </td>
                  <td className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">{t.exitReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ScrollArea>
    </section>
  )
}
