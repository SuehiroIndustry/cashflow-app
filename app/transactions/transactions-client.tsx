// app/transactions/transactions-client.tsx
"use client";

import React, { useMemo, useState } from "react";

import TransactionForm from "./transaction-form";
import TransactionsTable from "./transactions-table";

import type { CashCategoryOption } from "./_actions/getCashCategories";
import type { RecentCashFlowRow } from "./_actions/getRecentCashFlows";

type Option = { id: number; name: string };

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
  const [rows, setRows] = useState<RecentCashFlowRow[]>(initialRows);

  // 口座がない状態でも壊れないように
  const hasAccounts = useMemo(() => initialAccounts.length > 0 && initialCashAccountId !== 0, [initialAccounts, initialCashAccountId]);

  return (
    <div className="space-y-6">
      {/* ✅ ここが「消えてた上の方」 */}
      <TransactionForm
        accounts={initialAccounts}
        categories={initialCategories}
        initialCashAccountId={initialCashAccountId}
        disabled={!hasAccounts}
        onCreated={(newRow) => {
          // 新規を先頭に差し込む（最大30件維持）
          setRows((prev) => [newRow, ...prev].slice(0, 30));
        }}
      />

      <TransactionsTable
        rows={rows}
        onDeleted={(deletedId) => {
          setRows((prev) => prev.filter((r) => r.id !== deletedId));
        }}
      />
    </div>
  );
}