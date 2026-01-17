"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type { AccountRow } from "./_actions/getAccounts";
import type { MonthlyBalanceRow } from "./_actions/getMonthlyBalance";
import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

type RiskLevel = "GREEN" | "YELLOW" | "RED" | string;

export type OverviewPayload = {
  current_balance: number;
  month_income: number;
  month_expense: number;
  net_month: number;

  planned_income_30d: number;
  planned_expense_30d: number;
  net_planned_30d: number;

  projected_balance: number;
  projected_balance_30d: number;

  risk_level: RiskLevel;
  risk_score: number;
  computed_at: string | null;

  debug_rows?: unknown;
};

function yen(n: number) {
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.trunc(n).toLocaleString("ja-JP")}円`;
  }
}

function pickDefaultAccountId(accounts: AccountRow[]): string | null {
  if (!accounts || accounts.length === 0) return null;
  const def = accounts.find((a) => a.is_default);
  return (def?.id ?? accounts[0].id) || null;
}

export default function DashboardClient() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [monthly, setMonthly] = useState<MonthlyBalanceRow[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ① accountsは「後から来る」：マウント時に取得して、defaultを選ぶ
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingAccounts(true);
      setErrorMsg(null);

      const data = await getAccounts();

      if (cancelled) return;

      setAccounts(data);

      const defId = pickDefaultAccountId(data);
      setSelectedAccountId(defId);

      setLoadingAccounts(false);
    })().catch((e) => {
      console.error(e);
      if (cancelled) return;
      setLoadingAccounts(false);
      setErrorMsg("アカウント一覧の取得に失敗しました。");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ② accountIdが確定してからmonthlyを取りに行く（ここがエラー対策の核）
  useEffect(() => {
    if (!selectedAccountId) {
      setMonthly([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingMonthly(true);
      setErrorMsg(null);

      const data = await getMonthlyBalance(selectedAccountId);

      if (cancelled) return;

      setMonthly(data ?? []);
      setLoadingMonthly(false);
    })().catch((e) => {
      console.error(e);
      if (cancelled) return;
      setLoadingMonthly(false);
      setErrorMsg("月次残高の取得に失敗しました。");
    });

    return () => {
      cancelled = true;
    };
  }, [selectedAccountId]);

  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  // 最新月（クエリは month desc なので先頭が最新）
  const latest = monthly?.[0] ?? null;

  // OverviewPayloadを「絶対にundefinedを出さない」形で組む
  const overview: OverviewPayload = useMemo(() => {
    const month_income = latest?.income ?? 0;
    const month_expense = latest?.expense ?? 0;
    const current_balance = latest?.balance ?? 0;

    const net_month = month_income - month_expense;

    // ※ planned/projected は今は雛形。将来、transactions / planned テーブルから算出に差し替える
    const planned_income_30d = 0;
    const planned_expense_30d = 0;
    const net_planned_30d = planned_income_30d - planned_expense_30d;

    const projected_balance = current_balance; // 雛形
    const projected_balance_30d = current_balance + net_planned_30d;

    // 雑にでも良いので「動く」判定（あとでロジック差し替え前提）
    // balanceがマイナス → RED / 収支がマイナス → YELLOW
    let risk_level: RiskLevel = "GREEN";
    let risk_score = 10;

    if (current_balance < 0) {
      risk_level = "RED";
      risk_score = 90;
    } else if (net_month < 0) {
      risk_level = "YELLOW";
      risk_score = 60;
    }

    return {
      current_balance,
      month_income,
      month_expense,
      net_month,

      planned_income_30d,
      planned_expense_30d,
      net_planned_30d,

      projected_balance,
      projected_balance_30d,

      risk_level,
      risk_score,
      computed_at: new Date().toISOString(),
      debug_rows: { monthly_count: monthly?.length ?? 0 },
    };
  }, [latest, monthly]);

  const onChangeAccount = useCallback((id: string) => {
    setSelectedAccountId(id);
    // ここでrouter.refresh()は基本いらない（server action呼んでるだけなので）
    // ただし、サーバーコンポーネント依存を混ぜた場合は必要になることがある
    // router.refresh();
  }, [router]);

  return (
    <div className="space-y-4">
      {/* ヘッダー（アカウント選択） */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">Account</div>

        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedAccountId ?? ""}
          onChange={(e) => onChangeAccount(e.target.value)}
          disabled={loadingAccounts || accounts.length === 0}
        >
          {accounts.length === 0 ? (
            <option value="">(no accounts)</option>
          ) : (
            accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
                {a.is_default ? " *" : ""}
              </option>
            ))
          )}
        </select>

        {(loadingAccounts || loadingMonthly) && (
          <div className="text-xs text-gray-500">
            {loadingAccounts ? "loading accounts..." : "loading monthly..."}
          </div>
        )}

        {selectedAccount && (
          <div className="text-xs text-gray-500">
            id: {selectedAccount.id}
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {errorMsg && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Overview / Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OverviewCard
          accountName={selectedAccount?.name ?? "(unknown)"}
          overview={overview}
          yen={yen}
        />
        <BalanceCard
          accountName={selectedAccount?.name ?? "(unknown)"}
          monthly={monthly ?? []}
          yen={yen}
        />
      </div>

      {/* Chart（雛形） */}
      <EcoCharts
  accountName={selectedAccount?.name ?? "(unknown)"}
  monthly={monthly ?? []}
  yen={yen}
/>
    </div>
  );
}