// lib/dashboard/getDashboardOverview.ts

export type DashboardOverviewRow = {
  user_id: string;
  // unified（All）には cash_account_id は無い想定
  cash_account_id?: number | null;

  current_balance: number;
  income_mtd: number;
  expense_mtd: number;
  planned_income_30d: number;
  planned_expense_30d: number;
  projected_balance_30d: number;

  risk_level: "GREEN" | "YELLOW" | "RED";
  risk_score: number;

  computed_at: string; // ISO string
};

export type DashboardSelection =
  | { mode: "all" }
  | { mode: "account"; cashAccountId: number };

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return 0;
}

function normalizeRow(row: any): DashboardOverviewRow {
  return {
    user_id: String(row.user_id),
    cash_account_id:
      row.cash_account_id === undefined || row.cash_account_id === null
        ? null
        : Number(row.cash_account_id),

    current_balance: toNumber(row.current_balance),
    income_mtd: toNumber(row.income_mtd),
    expense_mtd: toNumber(row.expense_mtd),
    planned_income_30d: toNumber(row.planned_income_30d),
    planned_expense_30d: toNumber(row.planned_expense_30d),
    projected_balance_30d: toNumber(row.projected_balance_30d),

    risk_level: (row.risk_level ?? "GREEN") as "GREEN" | "YELLOW" | "RED",
    risk_score: toNumber(row.risk_score),

    computed_at: String(row.computed_at ?? ""),
  };
}

/**
 * Client から呼ぶ想定（"use client" OK）
 * API 側で認証cookieを使って Supabase へアクセスする
 */
export async function getDashboardOverview(
  selection: DashboardSelection
): Promise<DashboardOverviewRow> {
  const params = new URLSearchParams();

  if (selection.mode === "all") {
    params.set("mode", "all");
  } else {
    params.set("mode", "account");
    params.set("cashAccountId", String(selection.cashAccountId));
  }

  const res = await fetch(`/api/overview?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to load overview (${res.status})`);
  }

  const json = await res.json();
  // APIは { data: row } でも row直でも吸収
  const row = json?.data ?? json;
  if (!row) throw new Error("No overview data");

  return normalizeRow(row);
}