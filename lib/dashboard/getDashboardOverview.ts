// lib/dashboard/getDashboardOverview.ts
export type DashboardOverviewRow = {
  user_id: string
  cash_account_id: number

  current_balance: number
  income_mtd: number
  expense_mtd: number

  planned_income_30d: number
  planned_expense_30d: number
  projected_balance_30d: number

  risk_level: 'GREEN' | 'YELLOW' | 'RED'
  risk_score: number

  computed_at: string
}

export type DashboardOverviewFilter =
  | { mode: 'all' }
  | { mode: 'account'; cashAccountId: number }

function toQuery(filter: DashboardOverviewFilter) {
  const params = new URLSearchParams()
  if (filter.mode === 'account') params.set('cashAccountId', String(filter.cashAccountId))
  return params.toString()
}

/**
 * Client-safe:
 * - Supabaseのcookieセッションが必要な処理は /api 側でやる
 * - ここは単にAPIを叩くだけ
 */
export async function getDashboardOverview(
  filter: DashboardOverviewFilter
): Promise<DashboardOverviewRow> {
  const qs = toQuery(filter)
  const res = await fetch(`/api/overview${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to load overview: ${res.status} ${res.statusText} ${text}`)
  }

  const data = (await res.json()) as DashboardOverviewRow | null

  if (!data) throw new Error('No overview row returned')
  return data
}