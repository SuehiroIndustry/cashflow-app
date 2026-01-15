"use client";

import { useMemo, useState } from "react";
import type { DashboardOverviewRow } from "@/lib/dashboard/getDashboardOverview";

type Account = { id: number; name: string };

export default function DashboardClient({
  rows,
  accounts,
  computedAt,
}: {
  rows: DashboardOverviewRow[];
  accounts: Account[];
  computedAt: string | null;
}) {
  const [selected, setSelected] = useState<
    { mode: "all" } | { mode: "account"; cashAccountId: number }
  >({ mode: "all" });

  const filteredRows = useMemo(() => {
    if (selected.mode === "all") return rows;
    return rows.filter((r) => r.cash_account_id === selected.cashAccountId);
  }, [rows, selected]);

  // 「All」は合算表示にする（単一口座はそのまま）
  const overview = useMemo(() => {
    if (filteredRows.length === 0) return null;

    if (selected.mode === "account") return filteredRows[0];

    // All: 合算（risk_level は最悪ケースを採用）
    const sum = (key: keyof DashboardOverviewRow) =>
      filteredRows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

    const riskRank = (v: string) =>
      v === "RED" ? 3 : v === "YELLOW" ? 2 : v === "GREEN" ? 1 : 0;

    const worstRisk =
      filteredRows
        .map((r) => String(r.risk_level ?? ""))
        .sort((a, b) => riskRank(b) - riskRank(a))[0] || "GREEN";

    return {
      user_id: filteredRows[0].user_id,
      cash_account_id: 0,
      current_balance: sum("current_balance"),
      income_mtd: sum("income_mtd"),
      expense_mtd: sum("expense_mtd"),
      planned_income: sum("planned_income"),
      planned_expense: sum("planned_expense"),
      projected_balance_30d: sum("projected_balance_30d"),
      risk_level: worstRisk,
      computed_at: filteredRows[0].computed_at,
    } as DashboardOverviewRow;
  }, [filteredRows, selected]);

  return (
    <div className="p-6 space-y-6">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-3 py-1 rounded-full border ${
            selected.mode === "all" ? "opacity-100" : "opacity-60"
          }`}
          onClick={() => setSelected({ mode: "all" })}
        >
          All
        </button>

        {accounts.map((a) => (
          <button
            key={a.id}
            className={`px-3 py-1 rounded-full border ${
              selected.mode === "account" && selected.cashAccountId === a.id
                ? "opacity-100"
                : "opacity-60"
            }`}
            onClick={() => setSelected({ mode: "account", cashAccountId: a.id })}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {!overview && (
        <div className="opacity-70">
          データがありません（まだ cash_flows が無い or ビューが空）
        </div>
      )}

      {overview && (
        <>
          <div className="text-xs opacity-60">
            computed_at: {computedAt ?? overview.computed_at ?? "-"}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Kpi title="現在残高" value={overview.current_balance} />
            <Kpi title="今月の収入" value={overview.income_mtd} />
            <Kpi title="今月の支出" value={overview.expense_mtd} />

            {/* ※ビューのカラム名に合わせて planned_income / planned_expense */}
            <Kpi title="30日収入予定" value={overview.planned_income} />
            <Kpi title="30日支出予定" value={overview.planned_expense} />
            <Kpi title="30日後予測残高" value={overview.projected_balance_30d} />

            <div className="md:col-span-3">
              <div className="p-4 border rounded-xl">
                <div className="text-sm opacity-70">Risk</div>
                <div className="text-xl font-semibold">{overview.risk_level}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="p-4 border rounded-xl">
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-2xl font-semibold">
        ¥{Number(value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}