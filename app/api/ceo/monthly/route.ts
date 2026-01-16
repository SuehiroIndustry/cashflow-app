// app/api/ceo/monthly/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CashFlowRow = {
  date: string; // 'YYYY-MM-DD'
  section: "in" | "out" | string;
  amount: number | string | null;
  is_projection: boolean | null;
  cash_account_id: number | string | null;
};

type MonthlyRow = {
  month: string; // 'YYYY-MM-01'
  current_balance: number;
  month_income: number;
  month_expense: number;
  projected_balance_30d: number;
};

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === "bigint") return Number(v);
  return 0;
}

function monthKey(dateStr: string): string {
  // dateStr: 'YYYY-MM-DD' or ISO
  // → 'YYYY-MM-01'
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "1970-01-01";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function sortMonthAsc(a: string, b: string) {
  return a.localeCompare(b);
}

async function fetchAllCashFlows(params: {
  supabase: any;
  userId: string;
  cashAccountId?: number;
  fromDate?: string; // 'YYYY-MM-DD'
  toDate?: string; // 'YYYY-MM-DD'
}) {
  const { supabase, userId, cashAccountId, fromDate, toDate } = params;

  // Supabase は1回で取り切れない可能性があるのでページング
  const pageSize = 1000;
  let from = 0;
  let all: CashFlowRow[] = [];

  while (true) {
    let q = supabase
      .from("cash_flows")
      .select("date,section,amount,is_projection,cash_account_id")
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .range(from, from + pageSize - 1);

    if (cashAccountId !== undefined) {
      q = q.eq("cash_account_id", cashAccountId);
    }
    if (fromDate) {
      q = q.gte("date", fromDate);
    }
    if (toDate) {
      q = q.lte("date", toDate);
    }

    const { data, error } = await q;
    if (error) throw error;

    const rows = Array.isArray(data) ? (data as CashFlowRow[]) : [];
    all = all.concat(rows);

    if (rows.length < pageSize) break;
    from += pageSize;
    if (from > 20000) break; // 異常に多い場合の安全弁（必要なら増やせる）
  }

  return all;
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);

  // 任意：単一口座だけ見たい場合
  const cashAccountIdParam =
    url.searchParams.get("cash_account_id") ?? url.searchParams.get("accountId");
  const cashAccountIdNum = cashAccountIdParam ? Number(cashAccountIdParam) : NaN;
  const cashAccountId = Number.isFinite(cashAccountIdNum) ? cashAccountIdNum : undefined;

  // 任意：表示月数（デフォルト24ヶ月）
  const monthsParam = url.searchParams.get("months");
  const months = Math.min(
    60,
    Math.max(3, Number.isFinite(Number(monthsParam)) ? Number(monthsParam) : 24)
  );

  // 期間：過去Nヶ月〜未来は含めない（実績の月次推移）
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const fromDate = start.toISOString().slice(0, 10); // YYYY-MM-DD

  let flows: CashFlowRow[] = [];
  try {
    flows = await fetchAllCashFlows({
      supabase,
      userId: user.id,
      cashAccountId,
      fromDate,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch cash_flows" },
      { status: 500 }
    );
  }

  // 月次集計：実績だけ（is_projection !== true）
  const monthly = new Map<
    string,
    { income: number; expense: number; net: number }
  >();

  // 残高推移（累積）用：月ごとに「その月の純増減」を足していく
  for (const f of flows) {
    if (f.is_projection === true) continue;

    const mk = monthKey(f.date);
    const amt = toNumber(f.amount);

    const cur = monthly.get(mk) ?? { income: 0, expense: 0, net: 0 };

    if (f.section === "in") {
      cur.income += amt;
      cur.net += amt;
    } else if (f.section === "out") {
      cur.expense += amt;
      cur.net -= amt;
    } else {
      // section が想定外でも無視（壊すよりマシ）
    }

    monthly.set(mk, cur);
  }

  // 月順に整形
  const monthsSorted = Array.from(monthly.keys()).sort(sortMonthAsc);

  // 期間内にデータがない月も「0で埋めたい」ならここで補完できるが、
  // まずはデータある月だけ返す（最短で動かす）。
  let runningBalance = 0;

  const result: MonthlyRow[] = monthsSorted.map((mk) => {
    const m = monthly.get(mk)!;
    runningBalance += m.net;

    return {
      month: mk,
      current_balance: runningBalance,
      month_income: m.income,
      month_expense: m.expense,
      // まずは暫定：月次ページで「30日予測」を厳密にやるなら別ロジックにする
      projected_balance_30d: runningBalance,
    };
  });

  return NextResponse.json(result);
}