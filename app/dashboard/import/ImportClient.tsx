// app/dashboard/import/ImportClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { importRakutenCsv } from "./_actions/importRakutenCsv";

type PreviewRow = {
  date: string; // YYYY-MM-DD
  section: "income" | "expense";
  amount: number;
  memo: string;
};

function parseYMD(v: string): string | null {
  // 例: "20071104" or "2007/11/04"
  const s = String(v ?? "").trim();
  if (!s) return null;

  // 20071104
  if (/^\d{8}$/.test(s)) {
    const y = s.slice(0, 4);
    const m = s.slice(4, 6);
    const d = s.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  // 2007/11/04 or 2007-11-04
  const m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m) {
    const y = m[1];
    const mm = String(m[2]).padStart(2, "0");
    const dd = String(m[3]).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  return null;
}

function toAmount(v: string): number {
  const s = String(v ?? "").replace(/[,￥\s]/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function detectEncodingAndDecode(buf: ArrayBuffer): string {
  // まずUTF-8で試し、文字化け臭が強ければShift-JISにフォールバック
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buf);

  // “置換文字”が多い、または「�」が含まれる場合はSJIS優先
  const hasReplacement = utf8.includes("�");
  if (!hasReplacement) return utf8;

  // ブラウザ実装によっては "shift-jis" が通る
  try {
    return new TextDecoder("shift-jis", { fatal: false }).decode(buf);
  } catch {
    // 代替（通る環境もある）
    try {
      return new TextDecoder("windows-31j", { fatal: false }).decode(buf);
    } catch {
      return utf8; // 最後は諦めてutf8
    }
  }
}

function splitCsvLine(line: string): string[] {
  // シンプルCSVパーサ（ダブルクォート対応）
  const out: string[] = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (!inQ && ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseRakutenZengin(text: string): PreviewRow[] {
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 楽天「全銀」っぽいのは、先頭が "1","03",... の行（ヘッダ無し）になりがち
  // なのでヘッダ検出はしないで、行を固定位置で読む。
  const rows: PreviewRow[] = [];

  for (const line of lines) {
    const cols = splitCsvLine(line);

    // 最低限の列数が足りないのはスキップ
    if (cols.length < 10) continue;

    // 日付っぽいものを探す（列固定にせず、見つかった最初の8桁を使う）
    const dateRaw =
      cols.find((c) => /^\d{8}$/.test(String(c).replace(/"/g, ""))) ?? "";
    const date = parseYMD(String(dateRaw).replace(/"/g, ""));
    if (!date) continue;

    // 金額っぽいもの：大きい数値が入ってる列を拾う（固定列が環境でズレるので）
    const numericCandidates = cols
      .map((c) => String(c).replace(/"/g, ""))
      .filter((c) => /^-?[\d,]+$/.test(c));
    // 一番大きい値を金額候補とする（雑だけど実戦向き）
    const amount = numericCandidates
      .map(toAmount)
      .sort((a, b) => Math.abs(b) - Math.abs(a))[0] ?? 0;

    // 区分：行内に "1"(入金) / "2"(出金) がある場合があるので、それっぽい判定
    // それが無い場合は金額の符号で判定（+なら収入、-なら支出）
    const hasOut = cols.includes("2") || cols.includes('"2"');
    const hasIn = cols.includes("1") || cols.includes('"1"');
    const section: "income" | "expense" =
      hasOut && !hasIn ? "expense" : amount < 0 ? "expense" : "income";

    // 摘要：日本語が入ってそうな列を結合して拾う（文字化け対策は decode 側で済ませる）
    const memo = cols
      .map((c) => String(c).replace(/"/g, "").trim())
      .filter((c) => /[ぁ-んァ-ン一-龥]/.test(c))
      .join(" ")
      .slice(0, 200);

    rows.push({
      date,
      section,
      amount: Math.abs(amount),
      memo: memo || "-",
    });
  }

  return rows;
}

export default function ImportClient(props: { cashAccountId: number }) {
  const { cashAccountId } = props;
  const router = useRouter();

  const [fileName, setFileName] = useState<string>("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const top50 = useMemo(() => preview.slice(0, 50), [preview]);

  async function onPickFile(file: File | null) {
    setMsg("");
    setPreview([]);
    setFileName(file?.name ?? "");

    if (!file) return;

    const buf = await file.arrayBuffer();
    const text = detectEncodingAndDecode(buf);

    const rows = parseRakutenZengin(text);

    if (!rows.length) {
      setMsg("読み取れる行がありませんでした（形式か文字コードが違う可能性）");
      return;
    }
    setPreview(rows);
  }

  async function onImport() {
    if (!preview.length) return;
    setBusy(true);
    setMsg("");

    try {
      const res = await importRakutenCsv({
        cashAccountId,
        rows: preview,
      });

      if (!res.ok) {
        setMsg(res.error || "インポート失敗");
        return;
      }

      setMsg(`インポート完了：${res.inserted}件`);
      // ダッシュボードへ戻す（楽天固定ならcashAccountIdを維持）
      router.push(`/dashboard?cashAccountId=${cashAccountId}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-zinc-200">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="text-xl font-semibold">楽天銀行・明細インポート</div>
        <div className="mt-2 text-sm text-zinc-400">
          CSV/TSVをアップロードして、内容を確認してから取り込みます（Shift-JIS対応）。
        </div>
        <div className="mt-3 text-sm">
          cashAccountId: <span className="font-semibold">{cashAccountId}</span>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="font-semibold">ファイルアップロード</div>

        <div className="mt-3 flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800">
            ファイルを選択
            <input
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="text-sm text-zinc-400">
            {fileName ? `選択中: ${fileName}` : "未選択"}
          </div>
        </div>

        {msg && (
          <div
            className={`mt-4 rounded-md border px-4 py-3 text-sm ${
              msg.includes("完了")
                ? "border-emerald-900 bg-emerald-950/40 text-emerald-200"
                : "border-red-900 bg-red-950/40 text-red-200"
            }`}
          >
            {msg}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
            onClick={() => router.push(`/dashboard?cashAccountId=${cashAccountId}`)}
            disabled={busy}
          >
            ダッシュボードへ戻る
          </button>

          <button
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            onClick={onImport}
            disabled={busy || !preview.length}
          >
            {busy ? "処理中…" : "インポート実行"}
          </button>

          <div className="text-sm text-zinc-400">
            取り込み対象: {preview.length}件
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="font-semibold">プレビュー（先頭50件）</div>

        {!top50.length ? (
          <div className="mt-3 text-sm text-zinc-500">
            まだデータがありません（ファイルを選択してください）
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-400">
                <tr className="border-b border-zinc-800">
                  <th className="py-2 text-left">日付</th>
                  <th className="py-2 text-left">区分</th>
                  <th className="py-2 text-right">金額</th>
                  <th className="py-2 text-left">摘要</th>
                </tr>
              </thead>
              <tbody>
                {top50.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-900">
                    <td className="py-2">{r.date}</td>
                    <td className="py-2">{r.section === "income" ? "収入" : "支出"}</td>
                    <td className="py-2 text-right">{r.amount.toLocaleString()} 円</td>
                    <td className="py-2">{r.memo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}