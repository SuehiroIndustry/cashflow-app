// app/transactions/transactions-client.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import TransactionsTable, { type RecentRow } from "./transactions-table";
import { deleteCashFlow } from "./_actions/deleteCashFlow";

type Option = { id: number; name: string };

// 既存の getRecentCashFlows の row を想定（id/amount/date/section/categoryName/description）
export type RecentCashFlowRow = {
  id: number;
  date: string;
  section: "in" | "out";
  amount: number;
  cashCategoryName?: string | null;
  cash_category_name?: string | null; // どっちでも来ても吸収
  description?: string | null;
  memo?: string | null; // 念のため
};

export default function TransactionsClient({
  initialAccounts,
  initialCategories,
  initialCashAccountId,
  initialRows,
}: {
  initialAccounts: Option[];
  initialCategories: Option[];
  initialCashAccountId: number;
  initialRows: RecentCashFlowRow[];
}) {
  const router = useRouter();

  const [rows, setRows] = useState<RecentCashFlowRow[]>(initialRows);

  const tableRows: RecentRow[] = useMemo(() => {
    return (rows ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      section: r.section,
      amount: r.amount,
      categoryName:
        (r.cashCategoryName ?? r.cash_category_name ?? "") || "",
      description: (r.description ?? r.memo ?? null) as string | null,
    }));
  }, [rows]);

  const handleDelete = async (id: number) => {
    // 先にUIから消す（体感速い）
    setRows((prev) => prev.filter((x) => x.id !== id));

    try {
      await deleteCashFlow(id);
      // DB側でrevalidateされるけど、念のため画面も更新
      router.refresh();
    } catch (e) {
      // 失敗したら戻す
      setRows(initialRows);
      alert("削除に失敗しました。もう一度お試しください。");
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      {/* ここは既存の入力フォームUIがある前提なら、そのまま残してOK。
          もしこのファイルが“テーブル専用”だった場合でも、下のテーブルだけは動く。 */}

      <TransactionsTable rows={tableRows} onDelete={handleDelete} />
    </div>
  );
}