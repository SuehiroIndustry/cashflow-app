// app/dashboard/import/ImportClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type Props = {
  cashAccountId: number; // ← null を許さない
};

type PreviewRow = {
  date: string;
  section: string;
  amount: number;
  memo?: string;
};

function yen(n: number) {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

export default function ImportClient({ cashAccountId }: Props) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [status, setStatus] = useState("");

  const dashboardHref = `/dashboard?cashAccountId=${cashAccountId}`;

  const handlePickFile = async (file: File | null) => {
    setStatus("");
    setRows([]);
    setFileName(file?.name ?? "");

    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length);

      setRows(
        lines.slice(0, 50).map((_, i) => ({
          date: "-",
          section: "-",
          amount: 0,
          memo: `row ${i + 1}`,
        }))
      );

      setStatus("プレビューを作成しました（※パース処理は既存実装に差し替えてください）");
    } catch (e: any) {
      setStatus(`読み込みに失敗しました: ${e?.message ?? String(e)}`);
    }
  };

  const canImport = rows.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">
              楽天銀行・明細インポート
            </h1>
            <p className="mt-1 text-sm text-white/70">
              CSVを読み込み → 内容プレビュー → 取り込み
            </p>
          </div>

          <Link
            href={dashboardHref}
            className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
          >
            Dashboardへ戻る
          </Link>
        </div>
      </div>

      {/* Upload */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-semibold text-white">ファイルアップロード</div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">
            ファイルを選択
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="text-sm text-white/70">
            {fileName ? `選択: ${fileName}` : "選択されていません"}
          </div>

          <button
            type="button"
            disabled={!canImport}
            className="ml-auto rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            onClick={() => {
              setStatus("インポートを実行しました（※既存APIに接続してください）");
            }}
          >
            インポート実行
          </button>
        </div>

        <div className="mt-3 text-sm text-white/70">
          取り込み対象: {rows.length} 件
        </div>

        {status && (
          <div className="mt-3 rounded-md border border-white/10 bg-black/30 p-3 text-sm text-white/80">
            {status}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-semibold text-white">プレビュー（先頭50件）</div>

        <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
          <div className="grid grid-cols-4 gap-2 bg-black/30 px-3 py-2 text-xs text-white/70">
            <div>日付</div>
            <div>区分</div>
            <div className="text-right">金額</div>
            <div>摘要</div>
          </div>

          {rows.length ? (
            <div className="divide-y divide-white/10">
              {rows.map((r, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-4 gap-2 px-3 py-2 text-sm text-white/85"
                >
                  <div>{r.date}</div>
                  <div>{r.section}</div>
                  <div className="text-right tabular-nums">{yen(r.amount)}</div>
                  <div className="text-white/70">{r.memo}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-6 text-sm text-white/60">
              まだデータがありません（ファイルを選択してください）
            </div>
          )}
        </div>
      </div>
    </div>
  );
}