import { query, tableExists } from "@/lib/db"
import { ensurePremiumSchema } from "@/lib/premium/schema"

export type MasterRecentPayment = {
  id: string
  tipo: "mensalidade" | "premium"
  descricao: string
  academia: string
  valor: number
  paidAt: string | null
  metodo: string | null
}

export type MasterDashboardMetrics = {
  totalAcademias: number
  totalAlunos: number
  totalUsuarios: number
  totalAssinaturasPremium: number
  receitaTotal: number
  receitaMensal: number
  receitaAnual: number
  ultimosPagamentos: MasterRecentPayment[]
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function centsToBrl(cents: unknown): number {
  return toNumber(cents) / 100
}

async function countFrom(sql: string, params: unknown[] = []): Promise<number> {
  const rows = await query<{ total: number | string }>(sql, params)
  return toNumber(rows[0]?.total)
}

async function sumPagamentos(whereExtra = ""): Promise<number> {
  if (!(await tableExists("pagamentos"))) return 0
  const rows = await query<{ total: number | string | null }>(
    `SELECT COALESCE(SUM(valor), 0) AS total FROM pagamentos
     WHERE status = 'pago' AND data_pagamento IS NOT NULL ${whereExtra}`,
  )
  return toNumber(rows[0]?.total)
}

async function sumSubscriptions(whereExtra = ""): Promise<number> {
  if (!(await tableExists("subscriptions"))) return 0
  const rows = await query<{ total: number | string | null }>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM subscriptions
     WHERE 1=1 ${whereExtra}`,
  )
  return centsToBrl(rows[0]?.total)
}

async function loadRecentPagamentos(limit: number): Promise<MasterRecentPayment[]> {
  if (!(await tableExists("pagamentos"))) return []
  const rows = await query<{
    id: number
    aluno_nome: string
    academia: string
    valor: number | string
    data_pagamento: Date | string | null
    metodo: string | null
  }>(
    `SELECT p.id, p.aluno_nome, a.nome AS academia, p.valor, p.data_pagamento, p.metodo
     FROM pagamentos p
     INNER JOIN academias a ON a.id = p.academia_id
     WHERE p.status = 'pago' AND p.data_pagamento IS NOT NULL
     ORDER BY p.data_pagamento DESC, p.id DESC
     LIMIT ?`,
    [limit],
  )
  return rows.map((r) => ({
    id: `pag-${r.id}`,
    tipo: "mensalidade" as const,
    descricao: r.aluno_nome,
    academia: r.academia,
    valor: toNumber(r.valor),
    paidAt: r.data_pagamento ? String(r.data_pagamento).slice(0, 10) : null,
    metodo: r.metodo,
  }))
}

async function loadRecentSubscriptions(limit: number): Promise<MasterRecentPayment[]> {
  if (!(await tableExists("subscriptions"))) return []
  const rows = await query<{
    id: number
    nome: string
    academia: string
    amount_cents: number | string
    started_at: Date | string
    provider: string | null
  }>(
    `SELECT s.id, u.nome, a.nome AS academia, s.amount_cents, s.started_at, s.provider
     FROM subscriptions s
     INNER JOIN usuarios u ON u.id = s.user_id
     INNER JOIN academias a ON a.id = s.academia_id
     ORDER BY s.started_at DESC, s.id DESC
     LIMIT ?`,
    [limit],
  )
  return rows.map((r) => ({
    id: `sub-${r.id}`,
    tipo: "premium" as const,
    descricao: r.nome,
    academia: r.academia,
    valor: centsToBrl(r.amount_cents),
    paidAt: r.started_at ? String(r.started_at).slice(0, 10) : null,
    metodo: r.provider,
  }))
}

export async function loadMasterDashboardMetrics(): Promise<MasterDashboardMetrics> {
  await ensurePremiumSchema()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const pagamentosMonthFilter = `AND EXTRACT(YEAR FROM data_pagamento) = ${year} AND EXTRACT(MONTH FROM data_pagamento) = ${month}`
  const pagamentosYearFilter = `AND EXTRACT(YEAR FROM data_pagamento) = ${year}`
  const subsMonthFilter = `AND EXTRACT(YEAR FROM started_at) = ${year} AND EXTRACT(MONTH FROM started_at) = ${month}`
  const subsYearFilter = `AND EXTRACT(YEAR FROM started_at) = ${year}`

  const [
    totalAcademias,
    totalAlunos,
    totalUsuarios,
    totalAssinaturasPremium,
    pagamentosTotal,
    pagamentosMensal,
    pagamentosAnual,
    subsTotal,
    subsMensal,
    subsAnual,
    recentPagamentos,
    recentSubscriptions,
  ] = await Promise.all([
    countFrom("SELECT COUNT(*) AS total FROM academias"),
    countFrom("SELECT COUNT(*) AS total FROM alunos"),
    countFrom("SELECT COUNT(*) AS total FROM usuarios"),
    countFrom(
      `SELECT COUNT(*) AS total FROM usuarios
       WHERE subscription_status = 'premium'
         AND (premium_expires_at IS NULL OR premium_expires_at > now())`,
    ),
    sumPagamentos(),
    sumPagamentos(pagamentosMonthFilter),
    sumPagamentos(pagamentosYearFilter),
    sumSubscriptions(),
    sumSubscriptions(subsMonthFilter),
    sumSubscriptions(subsYearFilter),
    loadRecentPagamentos(10),
    loadRecentSubscriptions(10),
  ])

  const ultimosPagamentos = [...recentPagamentos, ...recentSubscriptions]
    .sort((a, b) => {
      const da = a.paidAt ? new Date(a.paidAt).getTime() : 0
      const db = b.paidAt ? new Date(b.paidAt).getTime() : 0
      return db - da
    })
    .slice(0, 10)

  return {
    totalAcademias,
    totalAlunos,
    totalUsuarios,
    totalAssinaturasPremium,
    receitaTotal: pagamentosTotal + subsTotal,
    receitaMensal: pagamentosMensal + subsMensal,
    receitaAnual: pagamentosAnual + subsAnual,
    ultimosPagamentos,
  }
}
