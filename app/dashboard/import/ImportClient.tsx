// app/dashboard/import/ImportClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { runRakutenImport, type RakutenImportRow } from "./_actions/runRakutenImport";

type Props = {
  cashAccountId: number; // ✅ 固定 number（nullなし）
};

function yen(n: number) {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

/**
 * CSV → rows（全件）を作る
 * ※ ここは「楽天CSVの列名」が違うとズレる。
 * 　もし既存の堅牢なパーサがあるなら、ここだけ差し替えてOK。
 */
async function parseCsvToRows(file: File): Promise<RakutenImportRow[]> {
  const text = await file.text();

  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];

  // 超簡易CSV（ダブルクォート/カンマ含みがあると壊れる）
  // 既存実装があるなら絶対そっちを使うのが正解。
  const header = lines[0].split(",");
  const idxDate = header.findIndex((h) => h.includes("日付"));
  const idxInOut = header.findIndex((h) => h.includes("入出金"));
  const idxAmount = header.findIndex((h) => h.includes("金額"));
  const idxMemo = header.findIndex((h) => h.includes("摘要") || h.includes("内容"));

  if (idxDate < 0 || idxInOut < 0 || idxAmount < 0) return [];

  const rows: RakutenImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const dateRaw = (cols[idxDate] ?? "").replaceAll('"', "").trim();
    const ioRaw = (cols[idxInOut] ?? "").replaceAll('"', "").trim();
    const amountRaw = (cols[idxAmount] ?? "").replaceAll('"', "").replaceAll(",", "").trim();
    const memoRaw = idxMemo >= 0 ? (cols[idxMemo] ?? "").replaceAll('"', "").trim() : "";

    if (!dateRaw) continue;

    const amount = Number(amountRaw || 0);
    if (!Number.isFinite(amount) || amount === 0) continue;

    const section: RakutenImportRow["section"] =
      ioRaw.includes("入金") || ioRaw.toLowerCase().includes("in") ? "収入" : "支出";

    rows.push({
      date: dateRaw,
      section,
      amount,
      memo: memoRaw || null,
    });
  }

  return rows;
}

export default function ImportClient({ cashAccountId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [allRows, setAllRows] = useState<RakutenImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const preview = useMemo(() => allRows.slice(0, 50), [allRows]);
  const previewCount = preview.length;
  const allCount = allRows.length;

  const previewSum = useMemo(
    () => preview.reduce((s, r) => s + (r.section === "収入" ? r.amount : -r.amount), 0),
    [preview]
  );

  async function onPick(f: File | null) {
    setMsg(null);
    setErr(null);
    setFile(f);
    setAllRows([]);

    if (!f) return;

    try {
      setBusy(true);
      const rows = await parseCsvToRows(f);
      setAllRows(rows);
      setMsg(rows.length ? `プレビューを作成しました（全${rows.length}件 / 先頭${Math.min(50, rows.length)}件表示）` : "プレビュー対象がありません（CSVを確認してください）");
    } catch (e: any) {
      setErr(e?.message ?? "プレビュー作成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function onImport() {
    setMsg(null);
    setErr(null);

    if (!file) {
      setErr("CSVファイルを選択してください");
      return;
    }
    if (allRows.length === 0) {
      setErr("取り込み対象がありません（CSVを確認してください）");
      return;
    }

    try {
      setBusy(true);

      // ✅ ここが本命：rowsを渡してDBへinsertする
      const res = await runRakutenImport({ cashAccountId, rows: allRows });

      if (!res.ok) {
        setErr(res.error ?? "取り込みに失敗しました");
        return;
      }

      setMsg(`インポートしました：${res.inserted}件（楽天銀行 ID=${cashAccountId}）`);
    } catch (e: any) {
      setErr(e?.message ?? "取り込みに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 text-white">
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">楽天銀行・明細インポート</div>
            <div className="mt-1 text-sm text-white/70">CSVを読み込み → 内容プレビュー → 取り込み</div>
            <div className="mt-3 text-sm text-white/70">
              口座：<span className="font-semibold text-white">楽天銀行（ID: {cashAccountId}）</span>
            </div>
          </div>

          {/* ✅ 依頼どおり Dashboardへ戻る */}
          <Link
            href={`/dashboard?cashAccountId=${cashAccountId}`}
            className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Dashboardへ戻る
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow">
        <div className="text-sm font-semibold">ファイルアップロード</div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-black/30">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
            ファイルを選択
          </label>

          <button
            type="button"
            onClick={onImport}
            disabled={busy || !file || allRows.length === 0}
            className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            インポート実行
          </button>
        </div>

        <div className="mt-3 text-sm text-white/70">
          選択: {file ? file.name : "なし"} / 全件: {allCount}件 / 表示(プレビュー): {previewCount}件 / 差分: {yen(previewSum)}
        </div>

        {msg ? <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">{msg}</div> : null}
        {err ? <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div> : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow">
        <div className="mb-3 text-sm font-semibold">プレビュー（先頭50件）</div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="px-3 py-2 text-left">日付</th>
                <th className="px-3 py-2 text-left">区分</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2 text-left">摘要</th>
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-white/60">
                    まだデータがありません（CSVを選択してください）
                  </td>
                </tr>
              ) : (
                preview.map((r, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">{r.section}</td>
                    <td className="px-3 py-2 text-right">{yen(r.amount)}</td>
                    <td className="px-3 py-2 text-white/70">{r.memo ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-white/50">
          ※ CSVの列定義が違う場合は、パース処理だけ既存の堅牢な実装に差し替えるのが安全。
        </div>
      </div>
    </div>
  );
}