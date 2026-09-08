"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import useSWR from "swr"
import type { BotSettings, Signal, Trade } from "@/lib/db/schema"
import type { Ticker } from "@/lib/trading/exchange"
import type { TickResult } from "@/lib/trading/bot"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "./header"
import { PriceCard } from "./price-card"
import { PositionCard } from "./position-card"
import { SignalPanel } from "./signal-panel"
import { TradeLog } from "./trade-log"
import { SettingsPanel } from "./settings-panel"
import { StatsRow } from "./stats-row"
import { ActivityFeed } from "./activity-feed"

export interface BotState {
  settings: BotSettings
  openTrade: Trade | null
  recentTrades: Trade[]
  latestSignal: Signal | null
  stats: { total: number; wins: number; pnl: number; best: number; worst: number }
}

export interface MarketData {
  ticker: Ticker
  series: { time: number; close: number; ema9: number; ema21: number; vwap: number }[]
}

export interface ActivityItem {
  id: number
  time: string
  text: string
  tone: "info" | "profit" | "loss" | "warning"
}

const TICK_INTERVAL_MS = 5000

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? "Request failed")
  return json
}

export function Dashboard() {
  const {
    data: state,
    mutate: mutateState,
    error: stateError,
  } = useSWR<BotState>("/api/bot/state", fetcher, { refreshInterval: 15000 })

  const symbol = state?.settings.symbol ?? "BTCUSD"
  const { data: market, mutate: mutateMarket } = useSWR<MarketData>(
    `/api/market?symbol=${symbol}`,
    fetcher,
    { refreshInterval: 10000 },
  )

  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [ticking, setTicking] = useState(false)
  const [countdown, setCountdown] = useState(TICK_INTERVAL_MS / 1000)
  const nextId = useRef(1)
  const isRunning = state?.settings.isRunning ?? false

  const pushActivity = useCallback(
    (text: string, tone: ActivityItem["tone"] = "info") => {
      setActivity((prev) =>
        [
          {
            id: nextId.current++,
            time: new Date().toISOString(),
            text,
            tone,
          },
          ...prev,
        ].slice(0, 40),
      )
    },
    [],
  )

  const runTick = useCallback(async () => {
    if (ticking) return
    setTicking(true)
    try {
      const res = await fetch("/api/bot/tick", { method: "POST" })
      const json = (await res.json()) as TickResult & { error?: string }
      if (!res.ok) throw new Error(json.error ?? "Tick failed")

      const tone: ActivityItem["tone"] = json.haltedReason
        ? "warning"
        : json.action.startsWith("Take profit")
          ? "profit"
          : json.action.startsWith("Stop loss")
            ? "loss"
            : json.action.startsWith("Opened")
              ? "warning"
              : "info"
      pushActivity(
        `${json.ticker.symbol} @ ${json.ticker.price.toLocaleString()} — ${json.action}`,
        tone,
      )
      await Promise.all([mutateState(), mutateMarket()])
    } catch (err) {
      pushActivity(
        err instanceof Error ? err.message : "Tick failed",
        "loss",
      )
    } finally {
      setTicking(false)
      setCountdown(TICK_INTERVAL_MS / 1000)
    }
  }, [ticking, pushActivity, mutateState, mutateMarket])

  useEffect(() => {
    if (!isRunning) return
    void runTick()
    const interval = setInterval(() => void runTick(), TICK_INTERVAL_MS)
    const cd = setInterval(
      () => setCountdown((c) => (c <= 1 ? TICK_INTERVAL_MS / 1000 : c - 1)),
      1000,
    )
    return () => {
      clearInterval(interval)
      clearInterval(cd)
    }
    // runTick identity changes with `ticking`; we intentionally only restart on isRunning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  const updateSettings = useCallback(
    async (patch: Partial<BotSettings>) => {
      const res = await fetch("/api/bot/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const updated = (await res.json()) as BotSettings
      await mutateState((prev) => (prev ? { ...prev, settings: updated } : prev), {
        revalidate: false,
      })
      if (patch.isRunning === true) pushActivity("Bot started — scanning every 5s", "profit")
      if (patch.isRunning === false) pushActivity("Bot paused", "warning")
      return updated
    },
    [mutateState, pushActivity],
  )

  const runAction = useCallback(
    async (action: "close_position" | "reset_paper") => {
      const res = await fetch("/api/bot/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      await res.json()
      await mutateState()
      pushActivity(
        action === "close_position"
          ? "Position closed manually"
          : "Paper account reset",
        "warning",
      )
    },
    [mutateState, pushActivity],
  )

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-3 p-3 sm:p-5">
      <Header
        settings={state?.settings}
        ticking={ticking}
        countdown={countdown}
        onToggle={(v) => updateSettings({ isRunning: v })}
      />

      {stateError ? (
        <p className="rounded-lg border border-loss/40 bg-loss/10 p-3 text-sm text-loss">
          {stateError.message}
        </p>
      ) : null}

      <StatsRow state={state} />

      <div className="grid gap-3 lg:grid-cols-5">
        <div className="flex flex-col gap-3 lg:col-span-3">
          <PriceCard market={market} symbol={symbol} />
          <PositionCard
            trade={state?.openTrade ?? null}
            price={market?.ticker.price}
            onClose={() => runAction("close_position")}
          />
        </div>
        <div className="lg:col-span-2">
          <SignalPanel signal={state?.latestSignal ?? null} />
        </div>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="activity">Live feed</TabsTrigger>
          <TabsTrigger value="trades">
            Trades{state ? ` (${state.stats.total})` : ""}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="activity">
          <ActivityFeed items={activity} running={isRunning} />
        </TabsContent>
        <TabsContent value="trades">
          <TradeLog trades={state?.recentTrades ?? []} />
        </TabsContent>
        <TabsContent value="settings">
          {state ? (
            <SettingsPanel
              settings={state.settings}
              onSave={updateSettings}
              onReset={() => runAction("reset_paper")}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </main>
  )
}
