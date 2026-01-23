// app/transactions/transactions-client.tsx
"use client";

import React, { useMemo, useState } from "react";

import TransactionForm from "./transaction-form";
import TransactionsTable from "./transactions-table";

import type { CashCategoryOption } from "./_actions/getCashCategories";
import type { RecentCashFlowRow } from "./_actions/getRecentCashFlows";

type Option = { id: number; name: string };

// ✅ Tableが欲しがる「表示用の行」(categoryNameを必須に固定)
export type RecentRow = {
  id: number;
  date: string;
  section: "in" | "out";
  amount: number;
  categoryName: string;
  description: string | null;
};

function toRecentRow(r: any): RecentRow {
  return {
    id: r.id as number,
    date: r.date as string,
    section: r.section as "in" | "out",
    amount: r.amount as number,
    categoryName:
      (r.categoryName as string) ??
      (r.cash_category_name as string) ??
      (r.cashCategoryName as string) ??
      "",
    description: (r.description as string | null) ?? null,
  };
}

type Props = {
  initialAccounts: Option[];
  initialCategories: CashCategoryOption[];
  initialCashAccountId: number;
  initialRows: RecentCashFlowRow[];
};

export default function TransactionsClient({
  initialAccounts,
  initialCategories,
  initialCashAccountId,
  initialRows,
}: Props) {
  // ✅ ここで正規化して state は RecentRow[] に統一
  const [rows, setRows] = useState<RecentRow[]>(() => (initialRows ?? []).map(toRecentRow));

  const hasAccounts = useMemo(
    () => initialAccounts.length > 0 && initialCashAccountId !== 0,
    [initialAccounts, initialCashAccountId]
  );

  return (
    <div className="space-y-6">
      <TransactionForm
        accounts={initialAccounts}
        categories={initialCategories}
        initialCashAccountId={initialCashAccountId}
        disabled={!hasAccounts}
        onCreated={(newRow) => {
          setRows((prev) => [newRow, ...prev].slice(0, 30));
        }}
      />

      {/* ✅ Tableへは RecentRow[] を渡す */}
      <TransactionsTable
  rows={rows}
  onDeleted={(deletedId: number) => {
    setRows((prev) => prev.filter((r) => r.id !== deletedId));
  }}
/>
    </div>
  );
}