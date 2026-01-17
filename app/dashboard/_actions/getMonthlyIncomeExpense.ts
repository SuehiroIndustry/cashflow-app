"use server";

import { createClient } from "@/utils/supabase/server";

export type MonthlyIncomeExpense = {
  income: number;
  expense: number;
};

export async function getMonthlyIncomeExpense(params: {
  cash_account_id: string; // bigint想定 → string
  month: string; // "YYYY-MM"
}): Promise<MonthlyIncomeExpense> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  const { cash_account_id, month } = params;

  // month: YYYY-MM を YYYY-MM-01 にして範囲検索
  const start = `${month}-01`;
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const end = endDate.toISOString().slice(0, 10); // YYYY-MM-DD

  // cash_flows を月範囲で取得（type別に集計）
  // ※ SupabaseのJSクライアントは group by + sum を扱いづらいので、
  //   まずは必要列だけ取ってサーバー側で集計する（確実に動く）
  const { data, error } = await supabase
    .from("cash_flows")
    .select("type,amount")
    .eq("cash_account_id", cash_account_id)
    .gte("date", start)
    .lt("date", end);

  if (error) throw new Error(error.message);

  let income = 0;
  let expense = 0;

  for (const row of data ?? []) {
    const amt = Number(row.amount) || 0;
    if (row.type === "income") income += amt;
    if (row.type === "expense") expense += amt;
  }

  return { income, expense };
}