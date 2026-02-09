// app/dashboard/import/ImportClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { runRakutenImport } from "./_actions/runRakutenImport";

type PreviewRow = {
  date: string; // YYYY-MM-DD
  section: "収入" | "支出" | "income" | "expense";
  amount: number;
  memo?: string | null;
};

type Props = {
  cashAccountId: number; // ✅ 固定で number（null を許さない）
};

function yen(n: number) {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

/**
 * ここは “最低限” のCSVプレビュー生成。
 * 既にあなたのコードにパーサがあるなら、そこへ差し替えればOK。
 */
async function parseCsvToPreview(file: File): Promise<PreviewRow[]> {
  const text = await file.text();

  // 既存のパーサがある前提ならここは差し替え推奨。
  // とりあえず「プレビューだけ作る」簡易版（列定義が違う場合はあなたの既存実装に戻す）
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];

  const header = lines[0].split(",");
  const idxDate = header.findIndex((h) => h.includes("日付"));
  const idxInOut = header.findIndex((h) => h.includes("入出金"));
  const idxAmount = header.findIndex((h) => h.includes("金額"));
  const idxMemo = header.findIndex((h) => h.includes("摘要") || h.includes("内容"));

  const rows: PreviewRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const dateRaw = cols[idxDate] ?? "";
    const ioRaw = cols[idxInOut] ?? "";
    const amountRaw = cols[idxAmount] ?? "0";
    const memoRaw = idxMemo >= 0 ? cols[idxMemo] : "";

    const date = dateRaw.replaceAll('"', "").trim();
    const amount = Number(String(amountRaw).replaceAll('"', "").replaceAll(",", "").trim() || 0);

    const io = ioRaw.replaceAll('"', "").trim();
    const section: PreviewRow["section"] =
      io.includes("入金") || io.toLowerCase().includes("in") ? "収入" : "支出";

    if (!date) continue;
    rows.push({ date, section, amount, memo: memoRaw?.replaceAll('"', "").trim() || null });
  }

  return rows.slice(0, 50);
}

export default function ImportClient({ cashAccountId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const previewCount = preview.length;
  const previewSum = useMemo(() => preview.reduce((s, r) => s + (r.section === "収入" ? r.amount : -r.amount), 0), [preview]);

  async function onPick(f: File | null) {
    setMsg(null);
    setErr(null);
    setFile(f);
    setPreview([]);

    if (!f) return;

    try {
      setBusy(true);
      const rows = await parseCsvToPreview(f);
      setPreview(rows);
      setMsg(rows.length ? `プレビューを作成しました（先頭${rows.length}件）` : "プレビュー対象がありません（CSVを確認してください）");
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

    try {
      setBusy(true);

      // ✅ 重要：ここで “必ず” cashAccountId=2 を渡す
      const res = await runRakutenImport({ cashAccountId, fileName: file.name });

      if (!res.ok) {
        setErr(res.error ?? "取り込みに失敗しました");
        return;
      }

      setMsg(`インポートしました：${res.inserted}件（口座ID=${cashAccountId}）`);
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
            disabled={busy || !file}
            className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            インポート実行
          </button>
        </div>

        <div className="mt-3 text-sm text-white/70">
          選択: {file ? file.name : "なし"} / 取り込み対象(プレビュー): {previewCount}件 / 差分: {yen(previewSum)}
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
          ※ パース処理が既存実装にある場合は、ここは既存のパーサへ戻してOK（表示だけこのUIを残すのが安全）
        </div>
      </div>
    </div>
  );
}