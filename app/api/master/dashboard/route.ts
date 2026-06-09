import { NextResponse } from "next/server"
import { requireMaster } from "@/lib/api/require-master"
import { loadMasterDashboardMetrics } from "@/lib/master/dashboard-metrics"

export async function GET(req: Request) {
  const auth = await requireMaster(req)
  if (!auth.ok) return auth.response

  try {
    const metrics = await loadMasterDashboardMetrics()
    return NextResponse.json(metrics)
  } catch (err) {
    console.error("GET /api/master/dashboard", err)
    return NextResponse.json({ error: "Erro ao carregar métricas master." }, { status: 500 })
  }
}
