// app/dashboard/_actions/getDashboardOverview.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function ymdMonth(d: string): string {
  return d.slice(0, 10);
}

export type DashboardOverview = {
  openingBalance: number; // 初期値合計
  currentBalance: number; // opening + cumulative net (non-initial)
  thisMonthIncome: number;
  thisMonthExpense: number;
  thisMonthNet: number;
  monthly: Array<{
    month: string; // YYYY-MM-01
    income: number;
    expense: number;
    net: number;
    balance: number; // 累積残高
  }>;
};

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw userErr;
  if (!user) throw new Error("Not authenticated");

  // ✅ @ts-expect-error は削除。org_id は安全に数値化する
  const orgId = toNumber((user as any)?.user_metadata?.org_id, 1);

  // 1) opening balance（初期値）
  const { data: openingData, error: openingErr } = await supabase
    .from("cash_flows")
    .select("amount, section, cash_category_id")
    .eq("org_id", orgId)
    .eq("source_type", "manual")
    .not("cash_category_id", "is", null);

  if (openingErr) throw openingErr;

  let openingBalance = 0;

  if (openingData && openingData.length > 0) {
    const catIds = Array.from(
      new Set(openingData.map((r: any) => r.cash_category_id).filter(Boolean))
    ) as number[];

    const { data: cats, error: catErr } = await supabase
      .from("cash_categories")
      .select("id,name")
      .in("id", catIds);

    if (catErr) throw catErr;

    const nameById = new Map<number, string>();
    (cats ?? []).forEach((c: any) => nameById.set(toNumber(c.id, 0), String(c.name ?? "")));

    for (const r of openingData as any[]) {
      const catName = nameById.get(toNumber(r.cash_category_id, 0)) ?? "";
      if (catName !== "初期値") continue;

      const amt = toNumber(r.amount, 0);
      const signed = r.section === "expense" ? -amt : amt;
      openingBalance += signed;
    }
  }

  // 2) 月次集計（初期値を除外）
  const { data: flows, error: flowsErr } = await supabase
    .from("cash_flows")
    .select("date, amount, section, cash_category_id")
    .eq("org_id", orgId);

  if (flowsErr) throw flowsErr;

  const allCatIds = Array.from(
    new Set((flows ?? []).map((r: any) => r.cash_category_id).filter(Boolean))
  ) as number[];

  const { data: allCats, error: allCatErr } = await supabase
    .from("cash_categories")
    .select("id,name")
    .in("id", allCatIds);

  if (allCatErr) throw allCatErr;

  const catNameById = new Map<number, string>();
  (allCats ?? []).forEach((c: any) =>
    catNameById.set(toNumber(c.id, 0), String(c.name ?? ""))
  );

  const monthMap = new Map<
    string,
    { month: string; income: number; expense: number; net: number }
  >();

  for (const r of (flows ?? []) as any[]) {
    const catName = r.cash_category_id
      ? catNameById.get(toNumber(r.cash_category_id, 0)) ?? ""
      : "";

    if (catName === "初期値") continue;

    const dateStr = typeof r.date === "string" ? r.date : String(r.date);
    const monthKey = `${dateStr.slice(0, 7)}-01`;

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