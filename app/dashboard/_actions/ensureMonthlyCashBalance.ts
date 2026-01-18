// app/dashboard/_actions/ensureMonthlyCashBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type EnsureArgs = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
};

function assertMonthKey(month: string) {
  // 期待フォーマット：YYYY-MM-01
  if (!/^\d{4}-\d{2}-01$/.test(month)) {
    throw new Error(`Invalid month format. Expected "YYYY-MM-01", got: ${month}`);
  }
}

export async function ensureMonthlyCashBalance(args: EnsureArgs): Promise<void> {
  const { cash_account_id, month } = args;
  if (!cash_account_id) return;
  if (!month) return;

  assertMonthKey(month);

  const supabase = await createSupabaseServerClient();

  // 1) すでに当月レコードがあるか
  const { data: existing, error: selErr } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month")
    .eq("cash_account_id", cash_account_id)
    .eq("month", month)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return; // あるなら終了

  // 2) 無いなら作る：前月balanceを初期値にする（無ければ0）
  // month は "YYYY-MM-01" なので、前月は Postgresで (month::date - interval '1 month')::date で作る
  const { data: prev, error: prevErr } = await supabase
    .from("monthly_cash_account_balances")
    .select("balance, month")
    .eq("cash_account_id", cash_account_id)
    .lt("month", month)
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevErr) throw prevErr;

  const initialBalance = Number(prev?.balance ?? 0);

  // 3) INSERT（RLSで user_id=auth.uid() が要求される想定）
  const { error: insErr } = await supabase.from("monthly_cash_account_balances").insert({
    cash_account_id,
    month, // "YYYY-MM-01"
    income: 0,
    expense: 0,
    balance: initialBalance,
    // user_id は DB 側 default(auth.uid()) があるなら不要。
    // ないなら明示する必要があるが、server action だと auth.uid() を直接ここで取れないので、
    // 基本は DB 側に default(auth.uid()) を置くのが正解。
  });

  if (insErr) throw insErr;
}