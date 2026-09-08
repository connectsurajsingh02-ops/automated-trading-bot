import type { MarketData } from "./dashboard"
import { fmtPct, fmtPrice, pnlClass } from "@/lib/trading/format"
import { cn } from "@/lib/utils"

function Sparkline({ series }: { series: MarketData["series"] }) {
  if (series.length < 2) return null
  const w = 600
  const h = 140
  const pad = 4
  const all = series.flatMap((p) => [p.close, p.ema9, p.ema21, p.vwap])
  const min = Math.min(...all)
  const max = Math.max(...all)
  const range = max - min || 1
  const x = (i: number) => pad + (i / (series.length - 1)) * (w - pad * 2)
  const y = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2)
  const path = (key: keyof MarketData["series"][number]) =>
    series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key] as number).toFixed(1)}`).join(" ")

  const last = series[series.length - 1]
  const first = series[0]
  const up = last.close >= first.close

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-32 w-full sm:h-36"
      role="img"
      aria-label="Last 90 minutes price with EMA9, EMA21 and VWAP"
      preserveAspectRatio="none"
    >
      <path d={path("vwap")} fill="none" stroke="var(--warning)" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.8" />
      <path d={path("ema21")} fill="none" stroke="var(--muted-foreground)" strokeWidth="1.2" opacity="0.7" />
      <path d={path("ema9")} fill="none" stroke="var(--foreground)" strokeWidth="1.2" opacity="0.6" />
      <path
        d={path("close")}
        fill="none"
        stroke={up ? "var(--profit)" : "var(--loss)"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PriceCard({ market, symbol }: { market?: MarketData; symbol: string }) {
  const t = market?.ticker
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Market price">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {symbol} · perpetual
          </p>
          <p className="font-mono text-3xl font-semibold tabular-nums leading-tight">
            {t ? fmtPrice(t.price) : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className={cn("font-mono text-sm tabular-nums", pnlClass(t?.change24hPct))}>
            {t ? fmtPct(t.change24hPct) : "—"} <span className="text-muted-foreground">24h</span>
          </p>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            H {t ? fmtPrice(t.high24h, 0) : "—"} · L {t ? fmtPrice(t.low24h, 0) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3">
        {market ? (
          <Sparkline series={market.series} />
        ) : (
          <div className="h-32 w-full animate-pulse rounded-md bg-muted sm:h-36" />
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-profit" aria-hidden /> Price
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-foreground/60" aria-hidden /> EMA 9
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-muted-foreground/70" aria-hidden /> EMA 21
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t border-dashed border-warning" aria-hidden /> VWAP
        </span>
      </div>
    </section>
  )
}
