export type RiskLevel = "GREEN" | "YELLOW" | "RED" | string;

/**
 * Overview（単月サマリ）
 */
export type OverviewPayload = {
  current_balance: number;
  month_income: number;
  month_expense: number;
  net_month: number;

  planned_income_30d: number;
  planned_expense_30d: number;
  net_planned_30d: number;

  projected_balance: number;
  projected_balance_30d: number;

  risk_level: RiskLevel;
  risk_score: number;
  computed_at: string | null;

  debug_rows?: unknown;
};

/**
 * Charts（月次推移用）
 * → EcoCharts.tsx で使用
 */
export type MonthlyBalanceRow = {
  month: string;     // '2026-01' or '2026-01-01'
  income: number;    // 月間収入
  expense: number;   // 月間支出（正の数）
  balance: number;   // 月末残高
};