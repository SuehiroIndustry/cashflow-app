// app/dashboard/_actions/getMonthlyBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyBalanceRow } from "../_types";

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toMonthKey(dateLike: string): string {
  // expects 'YYYY-MM-DD' or ISO string
  const s = String(dateLike);
  return `${s.slice(0, 7)}-01`; // YYYY-MM-01
}

type CashFlowRow = {
  date: string;
  amount: number | string | null;
  section: "income" | "expense" | string | null;
  cash_category_id: number | null;
  source_type: string | null;
};

type CashCategoryRow = {
  id: number;
  name: string;
};

export async function getMonthlyBalance(params: {
  cashAccountId: number;
  months: number; // 例: 12
}): Promise<MonthlyBalanceRow[]> {
  const supabase = await createSupabaseServerClient();

  // auth（RLS前提）
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  const cashAccountId = Number(params.cashAccountId);
  const months = Math.max(1, Number(params.months ?? 12));

  // 口座存在チェック + org_id 取得（org共有・user_idでは絞らない）
  const { data: account, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id, org_id")
    .eq("id", cashAccountId)
    .maybeSingle();

  if (accErr) {
    console.error("[getMonthlyBalance] cash_accounts error:", accErr);
    return [];
  }
  if (!account) {
    console.error("[getMonthlyBalance] cash account not found:", cashAccountId);
    return [];
  }

  const orgId = toNumber((account as any).org_id, 0);
  if (!orgId) {
    console.error("[getMonthlyBalance] org_id missing for cash account:", cashAccountId);
    return [];
  }

  // 対象口座の取引を取得
  const { data: flows, error: flowsErr } = await supabase
    .from("cash_flows")
    .select("date, amount, section, cash_category_id, source_type")
    .eq("org_id", orgId)
    .eq("cash_account_id", cashAccountId);

  if (flowsErr) {
    console.error("[getMonthlyBalance] cash_flows error:", flowsErr);
    return [];
  }

  const rows = (flows ?? []) as any as CashFlowRow[];

  // category 名を引く（'初期値' 判定用）
  const catIds = Array.from(
    new Set(rows.map((r) => r.cash_category_id).filter((v): v is number => typeof v === "number"))
  );

  let catNameById = new Map<number, string>();
  if (catIds.length > 0) {
    const { data: cats, error: catErr } = await supabase
      .from("cash_categories")
      .select("id, name")
      .in("id", catIds);

    if (catErr) {
      console.error("[getMonthlyBalance] cash_categories error:", catErr);
      return [];
    }

    (cats ?? []).forEach((c: any) => {
      const id = toNumber(c.id, 0);
      const name = String(c.name ?? "");
      if (id) catNameById.set(id, name);
    });
  }

  // 期首残高（カテゴリ名='初期値' かつ source_type='manual' の合計）
  // ※ section が income/expense どちらでも耐えるよう符号付きで合算
  let openingBalance = 0;
  for (const r of rows) {
    const catName = r.cash_category_id ? catNameById.get(r.cash_category_id) ?? "" : "";
    if (catName !== "初期値") continue;
    if (r.source_type !== "manual") continue;

    const amt = toNumber(r.amount, 0);
    const signed = r.section === "expense" ? -amt : amt;
    openingBalance += signed;
  }

  // 月次集計（初期値は除外）
  const monthAgg = new Map<
    string,
    { month: string; income: number; expense: number; net: number }
  >();

  for (const r of rows) {
    const catName = r.cash_category_id ? catNameById.get(r.cash_category_id) ?? "" : "";
    if (catName === "初期値") continue; // ✅ 初期値は月次収支から除外

    const monthKey = toMonthKey(r.date);
    const amt = toNumber(r.amount, 0);

    const cur =
      monthAgg.get(monthKey) ?? { month: monthKey, income: 0, expense: 0, net: 0 };

    if (r.section === "expense") {
      cur.expense += amt;
      cur.net -= amt;
    } else {
      // income / null / その他は income 扱い（既存データに寄せる）
      cur.income += amt;
      cur.net += amt;
    }

    monthAgg.set(monthKey, cur);
  }

  // 月昇順で累積残高（opening + running net）
  const monthlyAsc = Array.from(monthAgg.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  let running = openingBalance;
  const monthlyWithBalanceAsc = monthlyAsc.map((m) => {
    running += m.net;
    return {
      month: m.month,
      income: m.income,
      expense: m.expense,
      balance: running, // ✅ 累積残高
    };
  });

  // 直近 months 件だけ返す（既存と同じく降順）
  const sliced = monthlyWithBalanceAsc.slice(-months).reverse();

  return sliced.map((r) => ({
    month: String(r.month ?? ""),
    income: toNumber(r.income, 0),
    expense: toNumber(r.expense, 0),
    balance: toNumber(r.balance, 0),
  }));
}