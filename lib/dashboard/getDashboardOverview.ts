// lib/dashboard/getDashboardOverview.ts

export type DashboardOverviewRow = {
  current_balance: number;
  income_mtd: number;
  expense_mtd: number;
  planned_income_30d: number;
  planned_expense_30d: number;
  projected_balance_30d: number;
  risk_level: string;
  risk_score: number;
};

export async function getDashboardOverview(params: {
  accountId: number | null;
}): Promise<DashboardOverviewRow> {
  const query = params.accountId
    ? `/api/overview?accountId=${params.accountId}`
    : `/api/overview`;

  const res = await fetch(query, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard overview");
  }

  return res.json();
}