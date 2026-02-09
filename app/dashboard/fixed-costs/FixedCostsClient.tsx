// app/dashboard/fixed-costs/FixedCostsClient.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import type { FixedCostItem } from "./_actions";
import { bulkSaveFixedCosts, deleteFixedCost, upsertFixedCost } from "./_actions";

function yen(n: number) {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

function toNumber(v: string): number {
  const n = Number(v.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

type Row = FixedCostItem & { _isNew?: boolean };

export default function FixedCostsClient(props: { initialItems: FixedCostItem[] }) {
  const [items, setItems] = useState<Row[]>(
    (props.initialItems ?? []).map((x) => ({ ...x }))
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  const total = useMemo(() => {
    return items.reduce((sum, r) => sum + (r.enabled ? r.monthly_amount : 0), 0);
  }, [items]);

  function addRow() {
    setItems((prev) => [
      ...prev,
      {
        id: -Date.now(),
        name: "",
        monthly_amount: 0,
        enabled: true,
        sort_order: prev.length,
        _isNew: true,
      },
    ]);
  }

  async function saveAll() {
    setMessage("");
    startTransition(async () => {
      // 新規（仮id<0）は個別 upsert にして id を確定させる
      // 既存は bulk でまとめて保存
      const newOnes = items.filter((x) => x._isNew);
      const existing = items.filter((x) => !x._isNew);

      for (let i = 0; i < newOnes.length; i++) {
        const r = newOnes[i];
        const res = await upsertFixedCost({
          name: r.name || "（未設定）",
          monthly_amount: r.monthly_amount,
          enabled: r.enabled,
          sort_order: i,
        });
        if (!res.ok) {
          setMessage(res.message);
          return;
        }
      }

      const res2 = await bulkSaveFixedCosts(
        existing.map((r, idx) => ({
          id: r.id,
          name: r.name || "（未設定）",
          monthly_amount: r.monthly_amount,
          enabled: r.enabled,
          sort_order: idx,
        }))
      );

      if (!res2.ok) {
        setMessage(res2.message);
        return;
      }

      setMessage("保存しました。");
    });
  }

  async function removeRow(row: Row) {
    setMessage("");
    // 新規行はローカル削除だけ
    if (row._isNew || row.id < 0) {
      setItems((prev) => prev.filter((x) => x.id !== row.id));
      return;
    }

    startTransition(async () => {
      const res = await deleteFixedCost(row.id);
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== row.id));
      setMessage("削除しました。");
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">固定費設定（警告用）</h1>
          <p className="mt-1 text-sm text-white/70">
            ここで設定した固定費（月額）が、Dashboard の警告判定に使われます。
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/60">警告判定に使う固定費（月額合計）</div>
          <div className="mt-1 text-2xl font-semibold">{yen(total)}</div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={addRow}
          className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
        >
          追加
        </button>

        <button
          onClick={saveAll}
          disabled={isPending}
          className="rounded-md bg-white text-black px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {isPending ? "保存中..." : "保存"}
        </button>

        {message && <div className="text-sm text-white/80">{message}</div>}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-white/70">
            <tr className="border-b border-white/10">
              <th className="py-2 text-left">項目</th>
              <th className="py-2 text-right">月額</th>
              <th className="py-2 text-center">ON</th>
              <th className="py-2 text-right">操作</th>
            </tr>
          </thead>

          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b border-white/10">
                <td className="py-2 pr-3">
                  <input
                    value={r.name}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x))
                      )
                    }
                    className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-white placeholder:text-white/40"
                    placeholder="例）人件費"
                  />
                </td>

                <td className="py-2 pl-3 text-right">
                  <input
                    value={String(r.monthly_amount)}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === r.id ? { ...x, monthly_amount: toNumber(e.target.value) } : x
                        )
                      )
                    }
                    inputMode="numeric"
                    className="w-40 rounded-md bg-black/40 border border-white/10 px-3 py-2 text-white text-right placeholder:text-white/40"
                  />
                </td>

                <td className="py-2 text-center">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, enabled: e.target.checked } : x))
                      )
                    }
                    className="h-4 w-4"
                  />
                </td>

                <td className="py-2 text-right">
                  <button
                    onClick={() => removeRow(r)}
                    className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}

            {!items.length && (
              <tr>
                <td className="py-6 text-white/60" colSpan={4}>
                  まだ固定費が登録されていません。「追加」から入力してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-white/60">
        ※ ON の項目だけ合計に含まれます。  
        ※ ここで設定した数字は Simulation の初期値にも後で流用できます（同じ “真実の数字” を参照）。
      </div>
    </div>
  );
}