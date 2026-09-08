export function fmtPrice(n: number | string | null | undefined, digits = 1) {
  const v = Number(n)
  if (!Number.isFinite(v)) return "—"
  return v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function fmtMoney(n: number | string | null | undefined) {
  const v = Number(n)
  if (!Number.isFinite(v)) return "—"
  const sign = v > 0 ? "+" : v < 0 ? "-" : ""
  return `${sign}$${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function fmtPct(n: number | string | null | undefined, digits = 2) {
  const v = Number(n)
  if (!Number.isFinite(v)) return "—"
  const sign = v > 0 ? "+" : ""
  return `${sign}${v.toFixed(digits)}%`
}

export function fmtTime(d: string | Date | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

export function pnlClass(n: number | string | null | undefined) {
  const v = Number(n)
  if (v > 0) return "text-profit"
  if (v < 0) return "text-loss"
  return "text-muted-foreground"
}
