"use client";

import React, { useEffect, useState } from "react";
import { getCashFlows } from "./_actions/getCashFlows";
import { createCashFlow } from "./_actions/createCashFlow";

export default function TransactionsClient() {
  const [cashAccountId, setCashAccountId] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!cashAccountId) return;
    setLoading(true);
    try {
      const data = await getCashFlows({ cash_account_id: cashAccountId, limit: 50 });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    if (!cashAccountId) return;

    await createCashFlow({
      cash_account_id: cashAccountId,
      date: new Date().toISOString().slice(0, 10),
      type: "expense",
      amount: 1000,
      description: "test",
      source_type: "manual",
      // TODO: manualなら cash_category_id を必須にする
      cash_category_id: null,
    });

    await refresh();
  }

  useEffect(() => { refresh(); }, [cashAccountId]);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex gap-3 items-center">
          <input
            className="bg-white/5 border border-white/10 rounded px-3 py-2 w-[420px]"
            placeholder="cash_account_id を貼る（まずは暫定）"
            value={cashAccountId}
            onChange={(e) => setCashAccountId(e.target.value)}
          />
          <button
            className="border border-white/20 rounded px-3 py-2 hover:bg-white/10"
            onClick={refresh}
            disabled={!cashAccountId || loading}
          >
            Reload
          </button>
          <button
            className="border border-white/20 rounded px-3 py-2 hover:bg-white/10"
            onClick={onCreate}
            disabled={!cashAccountId}
          >
            + Add test
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/70 mb-2">
            {loading ? "Loading..." : `rows: ${rows.length}`}
          </div>

          <div className="divide-y divide-white/10">
            {rows.map((r) => (
              <div key={r.id} className="py-2 flex justify-between text-sm">
                <div className="w-[120px]">{r.date}</div>
                <div className="w-[90px]">{r.type}</div>
                <div className="w-[140px] text-right">
                  {Number(r.amount).toLocaleString("ja-JP")}
                </div>
                <div className="flex-1 pl-4 text-white/70">{r.description ?? ""}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}