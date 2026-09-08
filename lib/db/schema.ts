import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

export type StrategyId = "ema" | "rsi" | "vwap" | "orderbook"

export const botSettings = pgTable("bot_settings", {
  id: integer("id").primaryKey().default(1),
  isRunning: boolean("is_running").notNull().default(false),
  mode: text("mode").notNull().default("paper"),
  symbol: text("symbol").notNull().default("BTCUSD"),
  startingBalance: numeric("starting_balance", { precision: 18, scale: 2 })
    .notNull()
    .default("10000"),
  balance: numeric("balance", { precision: 18, scale: 2 })
    .notNull()
    .default("10000"),
  tradeSizePct: numeric("trade_size_pct", { precision: 6, scale: 2 })
    .notNull()
    .default("10"),
  takeProfitPct: numeric("take_profit_pct", { precision: 6, scale: 3 })
    .notNull()
    .default("0.15"),
  stopLossPct: numeric("stop_loss_pct", { precision: 6, scale: 3 })
    .notNull()
    .default("0.10"),
  maxDailyLossPct: numeric("max_daily_loss_pct", { precision: 6, scale: 2 })
    .notNull()
    .default("3"),
  strategies: jsonb("strategies").$type<StrategyId[]>().notNull(),
  minConfluence: integer("min_confluence").notNull().default(2),
  lastTickAt: timestamp("last_tick_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  side: text("side").$type<"long" | "short">().notNull(),
  status: text("status").$type<"open" | "closed">().notNull().default("open"),
  entryPrice: numeric("entry_price", { precision: 18, scale: 4 }).notNull(),
  exitPrice: numeric("exit_price", { precision: 18, scale: 4 }),
  quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull(),
  notional: numeric("notional", { precision: 18, scale: 2 }).notNull(),
  takeProfit: numeric("take_profit", { precision: 18, scale: 4 }).notNull(),
  stopLoss: numeric("stop_loss", { precision: 18, scale: 4 }).notNull(),
  pnl: numeric("pnl", { precision: 18, scale: 4 }),
  pnlPct: numeric("pnl_pct", { precision: 8, scale: 4 }),
  entryReason: text("entry_reason"),
  exitReason: text("exit_reason"),
  signals: jsonb("signals"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
})

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  price: numeric("price", { precision: 18, scale: 4 }).notNull(),
  decision: text("decision").notNull(),
  score: integer("score").notNull(),
  details: jsonb("details").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type BotSettings = typeof botSettings.$inferSelect
export type Trade = typeof trades.$inferSelect
export type Signal = typeof signals.$inferSelect
