import type { ActivityItem } from "./dashboard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fmtTime } from "@/lib/trading/format"
import { cn } from "@/lib/utils"

const TONE = {
  info: "text-muted-foreground",
  profit: "text-profit",
  loss: "text-loss",
  warning: "text-warning",
}

export function ActivityFeed({ items, running }: { items: ActivityItem[]; running: boolean }) {
  return (
    <section className="rounded-xl border bg-card" aria-label="Live activity">
      <ScrollArea className="h-56">
        <ul className="flex flex-col divide-y font-mono text-xs">
          {items.length === 0 ? (
            <li className="p-4 text-muted-foreground">
              {running
                ? "Waiting for first scan…"
                : "Bot is paused. Flip the switch to start scanning the market every 5 seconds."}
            </li>
          ) : (
            items.map((it) => (
              <li key={it.id} className="flex gap-3 px-3 py-2">
                <time className="shrink-0 tabular-nums text-muted-foreground/70" dateTime={it.time}>
                  {fmtTime(it.time)}
                </time>
                <span className={cn("break-words", TONE[it.tone])}>{it.text}</span>
              </li>
            ))
          )}
        </ul>
      </ScrollArea>
    </section>
  )
}
