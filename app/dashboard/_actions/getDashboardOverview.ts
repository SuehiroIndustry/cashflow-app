"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type MonthlyRow = {
  month: string; // YYYY-MM-01
  income: number;
  expense: number;
  net: number;
};

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function ymdMonth(d: string): string {
  // expecting "YYYY-MM-01" already; just return defensive
  return d.slice(0, 10);
}

export type DashboardOverview = {
  openingBalance: number;      // 初期値合計
  currentBalance: number;      // opening + cumulative net (non-initial)
  thisMonthIncome: number;
  thisMonthExpense: number;
  thisMonthNet: number;
  monthly: Array<{
    month: string;            // YYYY-MM-01
    income: number;
    expense: number;
    net: number;
    balance: number;          // 累積残高 (opening + running net)
  }>;
};

/**
 * Dashboard用の集計（B仕様）
 * - openingBalance: source_type=manual AND category_name='初期値'
 * - monthly net: category_name!='初期値'
 * - currentBalance: opening + sum(net)
 *
 * NOTE:
 * - cash_categories は user_id 無し（仕様メモ通り）
 * - category名は固定で '初期値'
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const supabase = await createSupabaseServerClient();

  // org_id はセッション/設定で拾える前提。既存実装に合わせて差し替えてOK。
  // もし既に org_id を引数で渡してるなら、引数化して使って。
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw userErr;
  if (!user) throw new Error("Not authenticated");

  // 既存で org_id を取得している箇所があるはずなので、そこに合わせてください。
  // ここでは profiles 等を参照しない。既存実装に合わせて orgId を差し替える想定。
  // @ts-expect-error - replace with your org id source
  const orgId: number = (user.user_metadata?.org_id ?? 1);

  // 1) opening balance（初期値）
  //  - manual かつ category.name='初期値'
  const { data: openingData, error: openingErr } = await supabase
    .from("cash_flows")
    .select("amount, section, cash_category_id")
    .eq("org_id", orgId)
    .eq("source_type", "manual")
    .not("cash_category_id", "is", null);

  if (openingErr) throw openingErr;

  let openingBalance = 0;

  if (openingData && openingData.length > 0) {
    // category名でフィルタするために cash_categories を取得
    const catIds = Array.from(
      new Set(openingData.map((r) => r.cash_category_id).filter(Boolean))
    ) as number[];

    const { data: cats, error: catErr } = await supabase
      .from("cash_categories")
      .select("id,name")
      .in("id", catIds);

    if (catErr) throw catErr;

    const nameById = new Map<number, string>();
    (cats ?? []).forEach((c) => nameById.set(c.id, c.name));

    for (const r of openingData) {
      const catName = nameById.get(r.cash_category_id as number) ?? "";
      if (catName !== "初期値") continue;

      const amt = toNumber(r.amount, 0);
      const signed = r.section === "expense" ? -amt : amt;
      openingBalance += signed;
    }
  }

  // 2) 月次集計（初期値を除外）
  // Supabaseクライアントだけで group by を綺麗にやるのが難しいので RPC/VIEW が理想だけど、
  // まずは SQL を使う（supabase.rpc ではなく、postgres function / view がないなら簡易実装）。
  // ここは既存の「月次一覧」を取っているActionがあるはずなので、そこに合わせて置換がベスト。
  //
  // ↓ 最小の妥協案：直近データを全部引いてJSで月次集計（件数が増えると重い）
  // MVPの範囲ならOK。将来はVIEW/RPCへ移行。

  const { data: flows, error: flowsErr } = await supabase
    .from("cash_flows")
    .select("date, amount, section, cash_category_id")
    .eq("org_id", orgId);

  if (flowsErr) throw flowsErr;

  // cash_category_id -> name
  const allCatIds = Array.from(
    new Set((flows ?? []).map((r) => r.cash_category_id).filter(Boolean))
  ) as number[];

  const { data: allCats, error: allCatErr } = await supabase
    .from("cash_categories")
    .select("id,name")
    .in("id", allCatIds);

  if (allCatErr) throw allCatErr;

  const catNameById = new Map<number, string>();
  (allCats ?? []).forEach((c) => catNameById.set(c.id, c.name));

  const monthMap = new Map<string, MonthlyRow>();

  for (const r of flows ?? []) {
    const catName = r.cash_category_id
      ? catNameById.get(r.cash_category_id as number) ?? ""
      : "";

    // 初期値は月次収支から除外
    if (catName === "初期値") continue;

    const dateStr = typeof r.date === "string" ? r.date : String(r.date);
    const monthKey = `${dateStr.slice(0, 7)}-01`; // YYYY-MM-01

    const amt = toNumber(r.amount, 0);

    const row = monthMap.get(monthKey) ?? {
      month: monthKey,
      income: 0,
      expense: 0,
      net: 0,
    };

    if (r.section === "expense") {
      row.expense += amt;
      row.net -= amt;
    } else {
      row.income += amt;
      row.net += amt;
    }

    monthMap.set(monthKey, row);
  }

  const monthlyRaw = Array.from(monthMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  // 3) running balance
  let running = openingBalance;
  const monthly = monthlyRaw.map((m) => {
    running += m.net;
    return { ...m, month: ymdMonth(m.month), balance: running };
  });

  const latest = monthly.length ? monthly[monthly.length - 1] : null;

  const currentBalance = latest ? latest.balance : openingBalance;

  // “今月”は latest を今月扱い（既存UIが最新月を今月として見せている前提）
  const thisMonthIncome = latest ? latest.income : 0;
  const thisMonthExpense = latest ? latest.expense : 0;
  const thisMonthNet = latest ? latest.net : 0;

  return {
    openingBalance,
    currentBalance,
    thisMonthIncome,
    thisMonthExpense,
    thisMonthNet,
    monthly,
  };
}