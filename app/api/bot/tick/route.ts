import { NextResponse } from "next/server"
import { runTick } from "@/lib/trading/bot"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const result = await runTick()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tick failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
