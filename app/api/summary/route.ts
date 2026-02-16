// app/api/summary/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type FlowRow = {
  section: "income" | "expense" | string;
  amount: number | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const account = url.searchParams.get("account"); // "all" | cash_account_id(number) | null

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isAll = !account || account === "all";
  const accountId = isAll ? null : Number(account);

  // -----------------------------
  // 0) org_id を確定
  // -----------------------------
  let orgId: number | null = null;

  if (accountId) {
    // 口座指定があるなら口座から org_id を取る（RLS前提）
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("org_id")
      .eq("id", accountId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message, hint: "Failed to query cash_accounts(org_id)" },
        { status: 500 }
      );
    }
    orgId = (data as any)?.org_id ?? null;
  } else {
    // 全口座：所属 org を1つ取る（基本1組織運用前提）
    const { data, error } = await supabase
      .from("org_members")
      .select("org_id")
      .order("org_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message, hint: "Failed to query org_members(org_id)" },
        { status: 500 }
      );
    }
    orgId = (data as any)?.org_id ?? null;
  }

  // org が取れないユーザーは空で返す（画面を落とさない）
  if (orgId == null) {
    return NextResponse.json({
      account: isAll ? "all" : String(accountId),
      income: 0,
      expense: 0,
      balance: 0,
      balance_updated_at: null,
    });
  }

  // -----------------------------
  // 1) balance（現在残高）はキャッシュから取得
  // -----------------------------
  let accQ = supabase
    .from("cash_accounts")
    .select("current_balance, balance_updated_at")
    .eq("org_id", orgId);

  if (accountId) accQ = accQ.eq("id", accountId);

  const { data: accounts, error: accErr } = await accQ;
  if (accErr) {
    return NextResponse.json(
      { error: accErr.message, hint: "Failed to query cash_accounts(balance)" },
      { status: 500 }
    );
  }

  const balance = (accounts ?? []).reduce((s: number, r: any) => {
    const v = typeof r?.current_balance === "number" ? r.current_balance : Number(r?.current_balance ?? 0);
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);

  // balance_updated_at は “最新” を返す（全口座なら最大）
  const balanceUpdatedAt =
    (accounts ?? [])
      .map((r: any) => r?.balance_updated_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  // -----------------------------
  // 2) income/expense は cash_flows を section で集計
  //    ※ projection(true) は除外
  // -----------------------------
  let q = supabase
    .from("cash_flows")
    .select("section,amount")
    .eq("org_id", orgId)
    .or("is_projection.is.null,is_projection.eq.false");

  if (accountId) {
    q = q.eq("cash_account_id", accountId);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: "Failed to query cash_flows" },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as FlowRow[];

  const income = rows
    .filter((r) => r.section === "income")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const expense = rows
    .filter((r) => r.section === "expense")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return NextResponse.json({
    account: isAll ? "all" : String(accountId),
    income,
    expense,
    balance,
    balance_updated_at: balanceUpdatedAt,
  });
}