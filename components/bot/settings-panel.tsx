"use client"

import { useState } from "react"
import type { BotSettings, StrategyId } from "@/lib/db/schema"
import { SUPPORTED_SYMBOLS } from "@/lib/trading/exchange"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const STRATEGIES: { id: StrategyId; name: string; hint: string }[] = [
  { id: "ema", name: "EMA 9/21 crossover", hint: "Trend direction" },
  { id: "rsi", name: "RSI 14", hint: "Oversold / overbought" },
  { id: "vwap", name: "VWAP bounce", hint: "Intraday fair value" },
  { id: "orderbook", name: "Order book momentum", hint: "Bid/ask imbalance + volume" },
]

interface Props {
  settings: BotSettings
  onSave: (patch: Partial<BotSettings>) => Promise<BotSettings>
  onReset: () => Promise<void>
}

export function SettingsPanel({ settings, onSave, onReset }: Props) {
  const [form, setForm] = useState({
    symbol: settings.symbol,
    tradeSizePct: settings.tradeSizePct,
    takeProfitPct: settings.takeProfitPct,
    stopLossPct: settings.stopLossPct,
    maxDailyLossPct: settings.maxDailyLossPct,
    minConfluence: settings.minConfluence,
    strategies: settings.strategies,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleStrategy = (id: StrategyId) =>
    setForm((f) => {
      const has = f.strategies.includes(id)
      if (has && f.strategies.length === 1) return f
      return {
        ...f,
        strategies: has ? f.strategies.filter((s) => s !== id) : [...f.strategies, id],
      }
    })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      minConfluence: Math.min(form.minConfluence, form.strategies.length),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const field = (
    key: "tradeSizePct" | "takeProfitPct" | "stopLossPct" | "maxDailyLossPct",
    label: string,
    hint: string,
    step: string,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={key} className="text-xs">
        {label}
      </Label>
      <Input
        id={key}
        type="number"
        inputMode="decimal"
        step={step}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="font-mono tabular-nums"
      />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label className="text-xs">Market</Label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Symbol">
            {SUPPORTED_SYMBOLS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={form.symbol === s}
                onClick={() => setForm((f) => ({ ...f, symbol: s }))}
                className={cn(
                  "rounded-md border px-3 py-1.5 font-mono text-xs transition-colors",
                  form.symbol === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {field("tradeSizePct", "Trade size (% of balance)", "Notional per scalp. 10% of $10,000 = $1,000 position.", "1")}
        {field("takeProfitPct", "Take profit (%)", "Scalping target. 0.15% on $1,000 ≈ $1.50 per win.", "0.01")}
        {field("stopLossPct", "Stop loss (%)", "Tight stop keeps losers small. Usually smaller than TP.", "0.01")}
        {field("maxDailyLossPct", "Max daily loss (%)", "Bot auto-pauses if today's realized loss exceeds this.", "0.5")}
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Strategies</Label>
          <div className="flex items-center gap-2 text-xs">
            <Label htmlFor="minConfluence" className="text-xs text-muted-foreground">
              Min agreeing
            </Label>
            <Input
              id="minConfluence"
              type="number"
              min={1}
              max={form.strategies.length}
              value={form.minConfluence}
              onChange={(e) => setForm((f) => ({ ...f, minConfluence: Number(e.target.value) }))}
              className="h-8 w-16 font-mono"
            />
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {STRATEGIES.map((s) => {
            const on = form.strategies.includes(s.id)
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                <div>
                  <p className="text-xs font-medium">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.hint}</p>
                </div>
                <Switch checked={on} onCheckedChange={() => toggleStrategy(s.id)} aria-label={s.name} />
              </li>
            )
          })}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          A trade opens only when at least {Math.min(form.minConfluence, form.strategies.length)} of{" "}
          {form.strategies.length} enabled strategies agree on direction.
        </p>
      </div>

      <Separator className="my-4" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-loss hover:text-loss"
          onClick={() => {
            if (confirm("Reset paper account? All trades and signals will be deleted.")) void onReset()
          }}
        >
          Reset paper account
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved" : "Save settings"}
        </Button>
      </div>
    </form>
  )
}
