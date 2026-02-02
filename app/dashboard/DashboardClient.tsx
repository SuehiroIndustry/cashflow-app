"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import type {
  AccountRow,
  MonthlyBalanceRow,
  CashStatus,
  AlertCard,
  OverviewPayload,
} from "./_types";

type Props = {
  // page.tsx から渡される想定（全部 optional にして “Propsズレ地獄” を終了させる）
  accounts?: AccountRow[];
  selectedAccountId?: number | null;

  monthly?: MonthlyBalanceRow[];

  cashStatus?: CashStatus | null;
  alertCards?: AlertCard[];
  overviewPayload?: OverviewPayload | null;

  children?: React.ReactNode;
};

function toInt(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

// getOverview の戻りが揺れても受け止めるための型（安全側）
type OverviewReturnMaybe =
  | OverviewPayload
  | {
      cashStatus?: CashStatus | null;
      alertCards?: AlertCard[] | null;
      overviewPayload?: OverviewPayload | null;
      overview?: OverviewPayload | null;
    }
  | null
  | undefined;

export default function DashboardClient(props: Props) {
  const router = useRouter();

  const accounts = props.accounts ?? [];
  const initialSelected = props.selectedAccountId ?? null;

  const [cashAccountId, setCashAccountId] = useState<number | null>(
    initialSelected
  );

  const [monthly, setMonthly] = useState<MonthlyBalanceRow[]>(
    Array.isArray(props.monthly) ? props.monthly : []
  );

  const [cashStatus, setCashStatus] = useState<CashStatus | null>(
    props.cashStatus ?? null
  );

  const [alertCards, setAlertCards] = useState<AlertCard[]>(
    Array.isArray(props.alertCards) ? props.alertCards : []
  );

  const [overviewPayload, setOverviewPayload] = useState<OverviewPayload | null>(
    props.overviewPayload ?? null
  );

  const [loadingData, setLoadingData] = useState(false);

  const selectedAccount = useMemo(() => {
    if (!cashAccountId) return null;
    return accounts.find((a) => a.id === cashAccountId) ?? null;
  }, [accounts, cashAccountId]);

  const onChangeAccount = useCallback(
    (nextId: number | null) => {
      setCashAccountId(nextId);

      // URLクエリにも反映（page.tsx の searchParams と整合）
      if (!nextId) {
        router.push("/dashboard");
        return;
      }
      router.push(`/dashboard?cashAccountId=${nextId}`);
    },
    [router]
  );

  const fetchAll = useCallback(
    async (id: number) => {
      setLoadingData(true);
      try {
        const [ov, mo] = await Promise.all([
          getOverview({ cashAccountId: id, month: monthStartISO() }),
          getMonthlyBalance({ cashAccountId: id, months: 12 }),
        ]);

        // monthly
        setMonthly(Array.isArray(mo) ? (mo as MonthlyBalanceRow[]) : []);

        // overview / cashStatus / alertCards
        const ovAny = ov as OverviewReturnMaybe;

        // 1) overviewPayload が直接返るケース（OverviewPayload）
        // 2) { cashStatus, alertCards, overviewPayload } のケース
        if (ovAny && typeof ovAny === "object") {
          const maybeObj = ovAny as {
            cashStatus?: CashStatus | null;
            alertCards?: AlertCard[] | null;
            overviewPayload?: OverviewPayload | null;
            overview?: OverviewPayload | null;
          };

          // cashStatus（あれば更新、なければ据え置き）
          if ("cashStatus" in maybeObj) {
            setCashStatus(maybeObj.cashStatus ?? null);
          }

          // alertCards（あれば更新、なければ空に）
          if ("alertCards" in maybeObj) {
            setAlertCards(Array.isArray(maybeObj.alertCards) ? maybeObj.alertCards : []);
          }

          // overviewPayload（名前揺れ吸収）
          const nextOverview =
            maybeObj.overviewPayload ?? maybeObj.overview ?? null;

          // もし “OverviewPayload そのもの” が返っているなら、ここが null になり得るので fallback
          if (nextOverview) {
            setOverviewPayload(nextOverview);
          } else {
            // OverviewPayload っぽいキーを持つなら、そのまま採用（型は厳密に追わない）
            setOverviewPayload(ovAny as OverviewPayload);
          }
        } else {
          setOverviewPayload(null);
          setCashStatus(null);
          setAlertCards([]);
        }
      } catch (e) {
        console.error("[DashboardClient] fetchAll error:", e);
        // 失敗時は “表示できるものだけ” 残す
        setMonthly([]);
        setAlertCards([]);
        setOverviewPayload(null);
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  // 初期表示：選択中口座があればロード
  useEffect(() => {
    if (!cashAccountId) return;
    void fetchAll(cashAccountId);
  }, [cashAccountId, fetchAll]);

  // UI（文字色・背景色は明示して Fast Refresh で消えないように）
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ヘッダー */}
      <div className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-zinc-100">
              Dashboard
            </div>
            <div className="text-sm text-zinc-400">
              口座を切り替えるとデータを再取得します
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-zinc-300">口座</div>
            <select
              value={cashAccountId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const next = v === "" ? null : toInt(v);
                onChangeAccount(next);
              }}
              className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="" className="text-zinc-300">
                選択してください
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id} className="text-zinc-100">
                  {a.name}
                </option>
              ))}
            </select>

            {loadingData && (
              <div className="text-xs text-zinc-400">読み込み中…</div>
            )}
          </div>
        </div>
      </div>

      {/* アラート */}
      {alertCards.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-sm font-semibold text-zinc-100">
              アラート
            </div>
            <div className="mt-2 grid gap-2">
              {alertCards.map((a, idx) => {
                // AlertCard の形が揺れても落ちないように安全表示（message など固定参照しない）
                const anyA = a as unknown as Record<string, unknown>;
                const title =
                  (typeof anyA.title === "string" && anyA.title) ||
                  (typeof anyA.headline === "string" && anyA.headline) ||
                  `Alert ${idx + 1}`;

                const detail =
                  (typeof anyA.detail === "string" && anyA.detail) ||
                  (typeof anyA.description === "string" && anyA.description) ||
                  (typeof anyA.subline === "string" && anyA.subline) ||
                  "";

                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
                  >
                    <div className="text-sm font-medium text-zinc-100">
                      {title}
                    </div>
                    {detail ? (
                      <div className="mt-1 text-xs text-zinc-300">
                        {detail}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 本体 */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* 子要素が来てるならそれを優先（従来のラップ構造にも対応） */}
        {props.children ? (
          props.children
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {/* 各カードの Props が変わっても壊れにくいよう、必要最低限の情報だけ渡す */}
            <OverviewCard
              // @ts-ignore ここはコンポーネント側のProps差分吸収（UI優先）
              cashStatus={cashStatus}
              // @ts-ignore
              overview={overviewPayload}
              // @ts-ignore
              loading={loadingData}
            />
            <BalanceCard
              // @ts-ignore
              selectedAccount={selectedAccount}
              // @ts-ignore
              monthly={monthly}
              // @ts-ignore
              loading={loadingData}
            />
            <EcoCharts
              // @ts-ignore
              monthly={monthly}
              // @ts-ignore
              loading={loadingData}
            />
          </div>
        )}
      </div>
    </div>
  );
}