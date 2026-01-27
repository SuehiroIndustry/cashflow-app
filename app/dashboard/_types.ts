// app/dashboard/_types.ts
export type AlertSeverity = "critical" | "warning" | "info";

export type AlertCard = {
  severity: AlertSeverity;
  title: string;
  description: string;
  actionLabel?: string;
  href?: string;
};

export type CashStatus = {
  selectedAccountId: number | null;
  selectedAccountName: string | null;
  currentBalance: number | null;

  // 今月（= monthlyの最新月行）
  monthLabel: string | null; // 例: "2026-01"
  monthIncome: number | null;
  monthExpense: number | null;
  monthNet: number | null;

  updatedAtISO: string; // サーバー生成
};

// DashboardClient で必要な “最低限の形” を固定する。
export type AccountRow = {
  id: number;
  name: string;
  current_balance: number;
};

export type MonthlyBalanceRow = {
  cash_account_id: number;
  month: string; // 例: "2026-01-01" or "2026-01"
  income: number;
  expense: number;
  balance: number;
};

/**
 * ✅ ここが今回のビルド失敗の原因。
 * deleteCashFlow.ts が import している型を _types に復活させる。
 *
 * 既存コードが `id` を使っている可能性が最も高いので、まずはこれで通す。
 * もし呼び出し側が `cashFlowId` を渡している設計だった場合は、次に合わせて直す。
 */
export type CashFlowDeleteInput = {
  id: number;
  cashAccountId: number;
};