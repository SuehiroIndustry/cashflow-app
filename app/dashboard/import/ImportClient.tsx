"use client";

import React, { useMemo, useState } from "react";
import { parseZenginCsvText, type ZenginParsedRow } from "./_lib/parseZenginCsv";

type Props = {
  cashAccountId: number;
};

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

function sectionLabel(s: "income" | "expense") {
  return s === "income" ? "収入" : "支出";
}

export default function ImportClient({ cashAccountId }: Props) {
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ZenginParsedRow[]>([]);
  const [error, setError] = useState<string>("");
  const [debug, setDebug] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ inserted: number } | null>(null);

  const preview = useMemo(() => rows.slice(0, 50), [rows]);

  async function onPickFile(file: File | null) {
    setError("");
    setDone(null);
    setRows([]);
    setDebug(null);

    if (!file) return;

    setFileName(file.name);

    try {
      const ab = await file.arrayBuffer();

      // ✅ Zengin is usually Shift_JIS (cp932)
      let text = "";
      try {
        text = new TextDecoder("shift_jis").decode(ab);
      } catch {
        text = new TextDecoder("utf-8").decode(ab);
      }

      const parsed = parseZenginCsvText(text);

      setRows(parsed.rows);
      setDebug(parsed.debug);

      const allDead =
        parsed.rows.length > 0 && parsed.rows.every((r) => r.date === "0000-00-00");
      if (allDead) {
        setError(
          "日付の解釈に失敗しています（令和YYMMDDの可能性）。パーサの date 欄を確認してください。"
        );
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "ファイルの読み込みに失敗しました。");
    }
  }

  async function onImport() {
    setError("");
    setDone(null);

    if (!cashAccountId) {
      setError("cashAccountId が指定されていません。URLに ?cashAccountId=2 のように付けてください。");
      return;
    }
    if (!rows.length) {
      setError("取り込み対象がありません。先にCSVを選択してください。");
      return;
    }

    setImporting(true);
    try {
      // ✅ multipart/form-data で送る（headers は絶対に指定しない）
      const fd = new FormData();
      fd.append("cashAccountId", String(cashAccountId));
      fd.append("sourceType", "import"); // DB制約の許可値に合わせる
      fd.append(
        "rows",
        JSON.stringify(
          rows.map((r) => ({
            date: r.date,
            section: r.section,
            amount: r.amount,
            summary: r.summary,
          }))
        )
      );

      const res = await fetch("/api/import/zengin", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Import failed (${res.status})`);
      }

      const json = await res.json();
      setDone({ inserted: Number(json?.inserted ?? rows.length) });
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "インポートに失敗しました。");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
        <div className="text-xl font-semibold">楽天銀行・明細インポート</div>
        <div className="mt-2 text-sm text-zinc-400">
          CSVを読み込み → 内容プレビュー → 取り込み（全銀CSV / Shift_JIS想定）
        </div>

        <div className="mt-4 text-sm">
          <div>cashAccountId: {cashAccountId}</div>
          {fileName ? <div>選択中: {fileName}</div> : <div className="text-zinc-400">未選択</div>}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
        <div className="font-semibold">ファイルアップロード</div>

        <div className="mt-3 flex items-center gap-3">
          <input
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-zinc-200 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-zinc-100 hover:file:bg-zinc-700"
          />
          <button
            type="button"
            onClick={onImport}
            disabled={importing || !rows.length}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            {importing ? "取り込み中…" : "インポート実行"}
          </button>
        </div>

        <div className="mt-3 text-sm text-zinc-400">取り込み対象: {rows.length} 件</div>

        {error && (
          <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {done && (
          <div className="mt-4 rounded-md border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-200">
            インポート完了：{done.inserted} 件
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
        <div className="font-semibold">プレビュー（先頭50件）</div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="py-2 pr-4">日付</th>
                <th className="py-2 pr-4">区分</th>
                <th className="py-2 pr-4">金額</th>
                <th className="py-2 pr-4">摘要</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="py-2 pr-4 tabular-nums">{r.date}</td>
                  <td className="py-2 pr-4">{sectionLabel(r.section)}</td>
                  <td className="py-2 pr-4 tabular-nums">{yen(r.amount)}</td>
                  <td className="py-2 pr-4">{r.summary || <span className="text-zinc-500">-</span>}</td>
                </tr>
              ))}
              {!preview.length && (
                <tr>
                  <td className="py-3 text-zinc-500" colSpan={4}>
                    まだデータがありません（ファイルを選択してください）
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {debug && (
          <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-300">
            <div className="font-semibold text-zinc-200">デバッグ</div>
            <div className="mt-2">delimiter: {String(debug.delimiter)}</div>
            <div>headerIndex: {String(debug.headerIndex)}</div>
            <div className="mt-2 whitespace-pre-wrap break-all">
              firstLines:
              {"\n"}
              {debug.firstLines?.join("\n")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}