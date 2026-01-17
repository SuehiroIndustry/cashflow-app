// app/dashboard/_types.ts

export type RiskLevel = "GREEN" | "YELLOW" | "RED" | string;

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

export type MonthlyBalanceRow = {
  month: string;   // "2026-01" みたいな想定
  income: number;
  expense: number;
  balance: number; // 月末残高（想定）
};

export type AccountRow = {
  id: string;
  name: string;
  type: string;       // "cash" | "bank" | ...（DBに合わせる）
  is_default: boolean;
};