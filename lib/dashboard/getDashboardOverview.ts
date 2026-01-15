'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * v_dashboard_overview_user_v2 の1行分（ユーザー×口座の集計）
 * ※ビュー側で auth.uid() フィルタ済みの想定
 */
export type DashboardOverviewRow = {
  user_id: string
  cash_account_id: number
  current_balance: number
  income_mtd: number
  expense_mtd: number
  planned_income: number
  planned_expense: number
  projected_balance_30d: number
  risk_level: 'GREEN' | 'YELLOW' | 'RED' | string
  computed_at: string // timestamp
}

export type GetDashboardOverviewResult = {
  rows: DashboardOverviewRow[]
  computedAt: string | null
}

/**
 * Dashboardの集計データを取得（口座ごとの一覧）
 * - サーバー専用（Supabase server client）
 * - キャッシュ無効（最新値を取りに行く）
 */
export async function getDashboardOverview(): Promise<GetDashboardOverviewResult> {
  // ダッシュボードは鮮度が命なので、Next.js のキャッシュを切る
  noStore()

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('v_dashboard_overview_user_v2')
    .select(
      [
        'user_id',
        'cash_account_id',
        'current_balance',
        'income_mtd',
        'expense_mtd',
        'planned_income',
        'planned_expense',
        'projected_balance_30d',
        'risk_level',
        'computed_at',
      ].join(','),
    )
    .order('cash_account_id', { ascending: true })

  if (error) {
    // ここで握りつぶすと地獄を見るので、はっきり落とす
    throw new Error(`getDashboardOverview failed: ${error.message}`)
  }

  const rows = (data ?? []).map((r: any) => ({
    user_id: String(r.user_id),
    cash_account_id: Number(r.cash_account_id),
    current_balance: Number(r.current_balance ?? 0),
    income_mtd: Number(r.income_mtd ?? 0),
    expense_mtd: Number(r.expense_mtd ?? 0),
    planned_income: Number(r.planned_income ?? 0),
    planned_expense: Number(r.planned_expense ?? 0),
    projected_balance_30d: Number(r.projected_balance_30d ?? 0),
    risk_level: (r.risk_level ?? 'GREEN') as DashboardOverviewRow['risk_level'],
    computed_at: r.computed_at ? String(r.computed_at) : new Date().toISOString(),
  })) as DashboardOverviewRow[]

  return {
    rows,
    computedAt: rows.length ? rows[0].computed_at : null,
  }
}