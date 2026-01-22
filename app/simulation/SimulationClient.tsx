"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAccounts } from "../dashboard/_actions/getAccounts";
import { getCashProjection } from "../dashboard/_actions/getCashProjection";

import type { CashAccount, CashProjectionResult } from "../dashboard/_types";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function yen(n: number): string {
  const v = Math.round(Number(n) || 0);
  return new Intl.NumberFormat("ja-JP").format(v);
}

export default function SimulationClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [cashAccountId, setCashAccountId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<string>(todayISO());
  const [days, setDays] = useState<number>(180);

  const [result, setResult] = useState<CashProjectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const acc = (await getAccounts()) as CashAccount[];
      setAccounts(acc);

      const nextId = cashAccountId ?? (acc?.length ? acc[0].id : null);
      if (nextId != null && cashAccountId == null) setCashAccountId(nextId);

      if (nextId == null) {
        setResult(null);
        return;
      }

      const r = await getCashProjection({
        cashAccountId: nextId,
        startDate,
        days,
      });

      setResult(r);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [cashAccountId, startDate, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const headline = useMemo(() => {
    if (!result) return null;
    if (!result.shortDate) {
      return {
        level: "safe" as const,
        text: `この条件では、${days}日以内に資金ショートしません。`,
      };
    }
    return {
      level: "danger" as const,
      text: `資金ショート見込み日：${result.shortDate}`,
    };
  }, [result, days]);

  const last = result?.rows?.[result.rows.length - 1];

  return (
    <div className="space-y-6">
      <div className="text-xl font-semibold">Simulation</div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm opacity-80">Account</label>
        <select
          className="border rounded px-2 py-1 bg-transparent"
          value={cashAccountId ?? ""}
          onChange={(e) => setCashAccountId(Number(e.target.value))}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} / id:{a.id}
            </option>
          ))}
        </select>

        <label className="text-sm opacity-80 ml-4">Start</label>
        <input
          className="border rounded px-2 py-1 bg-transparent"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="YYYY-MM-DD"
        />

        <label className="text-sm opacity-80 ml-4">Horizon</label>
        <select
          className="border rounded px-2 py-1 bg-transparent"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={90}>90 days</option>
          <option value={180}>180 days</option>
          <option value={365}>365 days</option>
        </select>

        <button className="border rounded px-3 py-1 ml-2" onClick={() => void load()}>
          {loading ? "loading..." : "run"}
        </button>
      </div>

      {err ? (
        <div className="border border-red-500/50 rounded p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {result ? (
        <div className="border rounded p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="font-semibold">結果</div>
            {headline ? (
              <span
                className={`text-xs px-2 py-0.5 rounded border ${
                  headline.level === "danger"
                    ? "border-red-500/60 text-red-200"
                    : "border-emerald-500/60 text-emerald-200"
                }`}
              >
                {headline.level === "danger" ? "危険" : "安全"}
              </span>
            ) : null}
          </div>

          <div className="text-sm opacity-80">{headline?.text}</div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="opacity-60">現在残高</div>
              <div className="font-semibold">¥{yen(result.currentBalance)}</div>
            </div>
            <div>
              <div className="opacity-60">期間末残高</div>
              <div className="font-semibold">¥{yen(last?.balance ?? result.currentBalance)}</div>
            </div>
            <div>
              <div className="opacity-60">開始日</div>
              <div className="font-semibold">{result.startDate}</div>
            </div>
            <div>
              <div className="opacity-60">予測日数</div>
              <div className="font-semibold">{result.days}日</div>
            </div>
          </div>

          <div className="text-xs opacity-60">
            ※ cash_flows の「未来予定」が入っている範囲だけが反映されます（未登録は0扱い）
          </div>
        </div>
      ) : null}

      {/* とりあえず上位20日だけ見せる（次でチャート化） */}
      {result ? (
        <div className="border rounded p-4">
          <div className="font-semibold mb-3">日次推移（先頭20日）</div>
          <div className="space-y-1 text-sm">
            {result.rows.slice(0, 20).map((r) => (
              <div key={r.date} className="flex justify-between gap-3">
                <div className="w-28">{r.date}</div>
                <div className="w-28 text-right">+¥{yen(r.income)}</div>
                <div className="w-28 text-right">-¥{yen(r.expense)}</div>
                <div className="w-28 text-right">=¥{yen(r.net)}</div>
                <div className="flex-1 text-right font-semibold">¥{yen(r.balance)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}