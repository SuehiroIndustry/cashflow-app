// app/transactions/new/page.tsx

import React from "react";
import TransactionForm from "./transaction-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Option = { id: number; name: string };

function toId(v: unknown): number | null {
  // Supabase から bigint が string で返ってくるケース対策
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
    return Number(v);
  return null;
}

export default async function NewTransactionPage() {
  const supabase = await createSupabaseServerClient();

  // 口座一覧
  const { data: accountsRaw, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id,name")
    .order("id", { ascending: true });

  if (accErr) {
    return (
      <div className="p-6">
        <div className="text-sm">口座の取得に失敗しました</div>
        <pre className="text-xs opacity-70 mt-2">{accErr.message}</pre>
      </div>
    );
  }

  // カテゴリ一覧（あなたの環境だと public.cash_categories）
  const { data: catsRaw, error: catErr } = await supabase
    .from("cash_categories")
    .select("id,name")
    .order("id", { ascending: true });

  if (catErr) {
    return (
      <div className="p-6">
        <div className="text-sm">カテゴリの取得に失敗しました</div>
        <pre className="text-xs opacity-70 mt-2">{catErr.message}</pre>
      </div>
    );
  }

  const accounts: Option[] = (accountsRaw ?? [])
    .map((a: any) => {
      const id = toId(a.id);
      if (!id) return null;
      return { id, name: String(a.name ?? "") };
    })
    .filter(Boolean) as Option[];

  const categories: Option[] = (catsRaw ?? [])
    .map((c: any) => {
      const id = toId(c.id);
      if (!id) return null;
      return { id, name: String(c.name ?? "") };
    })
    .filter(Boolean) as Option[];

  const initialCashAccountId: number | null = accounts.length
    ? accounts[0].id
    : null;

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">取引の登録</h1>

      <div className="mt-6">
        <TransactionForm
          accounts={accounts}
          categories={categories}
          initialCashAccountId={initialCashAccountId}
        />
      </div>
    </div>
  );
}