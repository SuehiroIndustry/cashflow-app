// app/dashboard/_actions/getOverview.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { OverviewPayload } from "../_types";

type Input = {
  cashAccountId: number; // 0 = all
  month: string; // YYYY-MM-01
};

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function isIncome(v: unknown) {
  const s = String(v ?? "");
  return s === "in" || s === "income" || s === "収入";
}
function isExpense(v: unknown) {
  const s = String(v ?? "");
  return s === "out" || s === "expense" || s === "支出";
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 返す payload は OverviewCard が参照する項目＋固定費（月額合計）を含める。
 * ※ OverviewPayload 側に fixedMonthlyCost を追加しておくこと（後述）
 */
export async function getOverview(input: Input): Promise<OverviewPayload> {
  const supabase = await createClient();

  const cashAccountId = Number(input.cashAccountId);
  const monthStart = new Date(input.month);
  if (Number.isNaN(monthStart.getTime())) {
    throw new Error("month が不正です（YYYY-MM-01）");
  }

  const nextMonth = addMonths(monthStart, 1);
  const from = monthStart.toISOString().slice(0, 10);
  const toExclusive = nextMonth.toISOString().slice(0, 10);

  // -----------------------------
  // 0) 固定費（月額合計）を取得
  // -----------------------------
  // fixed_cost_totals view がある前提（なければ fixed_cost_items をsumしてもOK）
  let fixedMonthlyCost = 0;

  {
    const { data, error } = await supabase
      .from("fixed_cost_totals")
      .select("total_monthly_fixed_cost")
      .maybeSingle();

    // view がまだ無い / 権限不足などでも overview 自体は落とさない
    if (!error) {
      fixedMonthlyCost = toNumber((data as any)?.total_monthly_fixed_cost);
    } else {
      // フォールバック：view が無い場合は items から合算（view作ってない場合に備える）
      const { data: items, error: itemsErr } = await supabase
        .from("fixed_cost_items")
        .select("monthly_amount, enabled");

      if (!itemsErr) {
        fixedMonthlyCost = (items ?? []).reduce((sum: number, r: any) => {
          const enabled = r?.enabled !== false;
          const amt = toNumber(r?.monthly_amount);
          return sum + (enabled ? amt : 0);
        }, 0);
      } else {
        // どっちもダメなら 0 扱い（落とさない）
        fixedMonthlyCost = 0;
      }
    }
  }

  // -----------------------------
  // 1) 口座名・残高
  // -----------------------------
  let accountName = "全口座";
  let currentBalance = 0;

  if (cashAccountId === 0) {
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("current_balance");
    if (error) throw error;
    currentBalance = (data ?? []).reduce(
      (sum: number, r: any) => sum + toNumber(r.current_balance),
      0
    );
  } else {
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("name, current_balance")
      .eq("id", cashAccountId)
      .maybeSingle();
    if (error) throw error;

    accountName = data?.name ?? `口座ID:${cashAccountId}`;
    currentBalance = toNumber(data?.current_balance);
  }

  // -----------------------------
  // 2) 今月の in/out（type/section どっちで入ってても拾う）
  // -----------------------------
  let q = supabase
    .from("cash_flows")
    .select("type, section, amount")
    .gte("date", from)
    .lt("date", toExclusive);

  if (cashAccountId !== 0) q = q.eq("cash_account_id", cashAccountId);

  const { data: flows, error: flowsError } = await q;
  if (flowsError) throw flowsError;

  let thisMonthIncome = 0;
  let thisMonthExpense = 0;

  for (const r of flows ?? []) {
    const t = (r as any).type;
    const s = (r as any).section;
    const amount = toNumber((r as any).amount);

    if (isIncome(s) || isIncome(t)) thisMonthIncome += amount;
    if (isExpense(s) || isExpense(t)) thisMonthExpense += amount;
  }

  const net = thisMonthIncome - thisMonthExpense;

  return {
    accountName,
    currentBalance: Math.round(currentBalance),
    thisMonthIncome: Math.round(thisMonthIncome),
    thisMonthExpense: Math.round(thisMonthExpense),
    net: Math.round(net),

    // ✅ 追加：警告判定に使う固定費（月額）
    fixedMonthlyCost: Math.round(fixedMonthlyCost),
  } as OverviewPayload;
}