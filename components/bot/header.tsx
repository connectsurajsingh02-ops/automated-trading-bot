"use client"

import { Activity, Zap } from "lucide-react"
import type { BotSettings } from "@/lib/db/schema"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface Props {
  settings?: BotSettings
  ticking: boolean
  countdown: number
  onToggle: (running: boolean) => void
}

export function Header({ settings, ticking, countdown, onToggle }: Props) {
  const running = settings?.isRunning ?? false
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="size-4" aria-hidden />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold leading-tight">ScalpBot</h1>
          <p className="text-xs text-muted-foreground">
            Delta Exchange · 1m scalping
          </p>
        </div>
        <Badge
          variant="outline"
          className="ml-1 border-warning/50 text-warning uppercase tracking-wide"
        >
          {settings?.mode ?? "paper"}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "relative flex size-2 rounded-full",
              running ? "bg-profit" : "bg-muted-foreground/50",
            )}
            aria-hidden
          >
            {running ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-profit opacity-60" />
            ) : null}
          </span>
          {running ? (
            <span className="font-mono tabular-nums">
              {ticking ? (
                <span className="inline-flex items-center gap-1">
                  <Activity className="size-3 animate-pulse" aria-hidden /> scanning
                </span>
              ) : (
                `next in ${countdown}s`
              )}
            </span>
          ) : (
            "paused"
          )}
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <span className="sr-only sm:not-sr-only">{running ? "ON" : "OFF"}</span>
          <Switch
            checked={running}
            onCheckedChange={(v) => onToggle(Boolean(v))}
            disabled={!settings}
            aria-label="Toggle bot"
          />
        </label>
      </div>
    </header>
  )
}
