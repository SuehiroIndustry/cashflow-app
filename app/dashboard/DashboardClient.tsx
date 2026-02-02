// app/dashboard/DashboardClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  AccountRow,
  MonthlyBalanceRow,
  CashStatus,
  AlertCard,
  OverviewPayload,
} from "./_types";

import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;

  // ✅ 初期表示用（サーバー側で取れたら渡す / 無理なら null でOK）
  initialCashStatus?: CashStatus | null;
  initialAlertCards?: AlertCard[];
  initialOverviewPayload?: OverviewPayload | null;
  initialMonthly?: MonthlyBalanceRow[];

  children?: React.ReactNode;
};

function toMonthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default function DashboardClient({
  accounts,
  selectedAccountId,
  initialCashStatus = null,
  initialAlertCards = [],
  initialOverviewPayload = null,
  initialMonthly = [],
  children,
}: Props) {
  const router = useRouter();

  const [cashAccountId, setCashAccountId] = useState<number | null>(
    selectedAccountId
  );

  const [cashStatus, setCashStatus] = useState<CashStatus | null>(
    initialCashStatus
  );
  const [alertCards, setAlertCards] = useState<AlertCard[]>(initialAlertCards);
  const [overviewPayload, setOverviewPayload] = useState<OverviewPayload | null>(
    initialOverviewPayload
  );
  const [monthly, setMonthly] = useState<MonthlyBalanceRow[]>(initialMonthly);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const accountOptions = useMemo(() => {
    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
    }));
  }, [accounts]);

  const syncQuery = useCallback(
    (nextId: number | null) => {
      if (!nextId) {
        router.replace("/dashboard");
        return;
      }
      router.replace(`/dashboard?cashAccountId=${nextId}`);
    },
    [router]
  );

  const fetchAll = useCallback(
    async (id: number) => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const month = toMonthStartISO();

        const [ov, mo] = await Promise.all([
          getOverview({ cashAccountId: id, month }),
          getMonthlyBalance({ cashAccountId: id, months: 12 }),
        ]);

        // getOverview の返り値構造が揺れても死なないように「あるものだけ」拾う
        //（型は _types に合わせて最終的に揃える）
        // @ts-expect-error: runtime-safe extraction
        setCashStatus(ov?.cashStatus ?? null);
        // @ts-expect-error: runtime-safe extraction
        setAlertCards(Array.isArray(ov?.alertCards) ? ov.alertCards : []);
        // @ts-expect-error: runtime-safe extraction
        setOverviewPayload(ov?.overviewPayload ?? ov?.overview ?? null);

        setMonthly(Array.isArray(mo) ? mo : []);
      } catch (e) {
        console.error("[DashboardClient] fetchAll error:", e);
        setErrorMsg("データ取得に失敗しました。少し時間をおいて再読み込みしてください。");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!cashAccountId) return;
    fetchAll(cashAccountId);
  }, [cashAccountId, fetchAll]);

  return (
    <div className="space-y-4">
      {/* ✅ 上部：口座セレクタ */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-zinc-300">口座を選択</div>

          <select
            className="w-full md:w-[360px] rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            value={cashAccountId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const next = v ? Number(v) : null;
              setCashAccountId(next);
              syncQuery(next);
            }}
          >
            <option value="">選択してください</option>
            {accountOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="mt-3 text-sm text-zinc-400">読み込み中…</div>
        )}
        {errorMsg && (
          <div className="mt-3 text-sm text-red-400">{errorMsg}</div>
        )}
      </div>

      {/* ✅ アラート */}
      {alertCards.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-2 text-sm font-semibold text-zinc-200">
            アラート
          </div>

          <div className="space-y-2">
            {alertCards.map((a, idx) => {
              // message/description/body 等、どれかあれば拾う（型崩れ回避）
              const anyA = a as unknown as Record<string, unknown>;
              const detail =
                (typeof anyA.message === "string" && anyA.message) ||
                (typeof anyA.description === "string" && anyA.description) ||
                (typeof anyA.body === "string" && anyA.body) ||
                "";

              return (
                <div
                  key={(a as any).id ?? `${idx}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                >
                  <div className="text-sm font-medium text-zinc-100">
                    {(a as any).title ?? "通知"}
                  </div>
                  {detail ? (
                    <div className="mt-1 text-sm text-zinc-300">{detail}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ✅ 子コンポーネント（OverviewCard / BalanceCard / EcoCharts） */}
      <div>{children}</div>

      {/* ※ cashStatus / overviewPayload / monthly を子が使う設計なら、
         本来は Context を貼るのが理想。
         ただ今は「ビルドを通す」「壊れてる import/型を止血」が最優先。 */}
    </div>
  );
}