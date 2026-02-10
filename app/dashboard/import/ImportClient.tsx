// app/dashboard/import/ImportClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { importRakutenCsv } from "./_actions/importRakutenCsv";
import type { Row } from "./_actions/importRakutenCsv";

type Props = {
  cashAccountId: number; // 2固定
};

function yen(n: number) {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function looksLikeRakutenCsv(text: string): boolean {
  // 楽天のヘッダ/項目名が読めているかを雑に判定（文字化け対策）
  // 1つでも含まれれば「当たり」の可能性が高い
  const keys = ["日付", "取引日", "支払日", "入出金", "区分", "金額", "摘要", "内容", "メモ"];
  return keys.some((k) => text.includes(k));
}

function safeDecode(buf: ArrayBuffer, encoding: string): string | null {
  try {
    // TextDecoder は未対応の encoding を渡すと例外になる環境がある
    const td = new TextDecoder(encoding as any);
    return td.decode(buf);
  } catch {
    return null;
  }
}

async function readCsvText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();

  // ✅ ここがポイント：環境ごとの encoder 名差を吸収する
  // - "shift-jis" がダメな環境がある
  // - "windows-31j" が通る環境がある
  // - どれもダメなら utf-8
  const candidates = [
    "shift-jis",
    "windows-31j",
    "shift_jis",
    "sjis",
    "utf-8",
  ];

  // 1) ヘッダが読めるエンコーディングを探す
  for (const enc of candidates) {
    const text = safeDecode(buf, enc);
    if (!text) continue;

    // BOM除去（UTF-8 BOM対策）
    const cleaned = text.replace(/^\uFEFF/, "");

    if (looksLikeRakutenCsv(cleaned)) {
      return cleaned;
    }
  }

  // 2) どれも「楽天っぽく」見えなかった場合は、最後の保険で utf-8
  const fallback = safeDecode(buf, "utf-8");
  return (fallback ?? "").replace(/^\uFEFF/, "");
}

async function parseRakutenCsv(file: File): Promise<Row[]> {
  const text = await readCsvText(file);

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.replaceAll("\uFEFF", "").trim());

  const findIdx = (cands: string[]) =>
    header.findIndex((h) => cands.some((c) => h.includes(c)));

  const idxDate = findIdx(["日付", "取引日", "取引日付", "支払日"]);
  const idxInOut = findIdx(["入出金", "区分", "摘要区分"]);
  const idxAmount = findIdx(["金額", "入金額", "出金額"]);
  const idxMemo = findIdx(["摘要", "内容", "メモ", "取引内容"]);

  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);

    const dateRaw = (idxDate >= 0 ? cols[idxDate] : "") ?? "";
    const ioRaw = (idxInOut >= 0 ? cols[idxInOut] : "") ?? "";
    const amountRaw = (idxAmount >= 0 ? cols[idxAmount] : "") ?? "";
    const memoRaw = (idxMemo >= 0 ? cols[idxMemo] : "") ?? "";

    const date = dateRaw.replaceAll("/", "-").replaceAll('"', "").trim();
    const amount = Number(
      String(amountRaw).replaceAll('"', "").replaceAll(",", "").replaceAll("円", "").trim() || 0
    );

    if (!date || !Number.isFinite(amount)) continue;

    const io = ioRaw.replaceAll('"', "").trim();
    const section: Row["section"] =
      io.includes("入") || io.toLowerCase().includes("in") ? "income" : "expense";

    rows.push({
      date,
      section,
      amount: Math.abs(Math.trunc(amount)),
      memo: memoRaw?.replaceAll('"', "").trim() || "",
    });
  }

  return rows;
}

export default function ImportClient({ cashAccountId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const preview = useMemo(() => rows.slice(0, 50), [rows]);

  const previewSum = useMemo(() => {
    return preview.reduce((s, r) => s + (r.section === "income" ? r.amount : -r.amount), 0);
  }, [preview]);

  async function onPick(f: File | null) {
    setMsg(null);
    setErr(null);
    setFile(f);
    setRows([]);

    if (!f) return;

    try {
      setBusy(true);
      const parsed = await parseRakutenCsv(f);
      setRows(parsed);
      setMsg(
        parsed.length
          ? `プレビューを作成しました（全${parsed.length}件 / 表示は先頭${Math.min(
              50,
              parsed.length
            )}件）`
          : "プレビュー対象がありません（CSVの形式/文字コードを確認してください）"
      );
    } catch (e: any) {
      setErr(e?.message ?? "プレビュー作成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function onImport() {
    setMsg(null);
    setErr(null);

    if (!file) return setErr("CSVファイルを選択してください");
    if (rows.length === 0) return setErr("取り込み対象が0件です（まずプレビューが出る状態にしてください）");

    try {
      setBusy(true);
      const res = await importRakutenCsv({ cashAccountId, rows });

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
            disabled={busy || !file || rows.length === 0}
            className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            インポート実行
          </button>
        </div>

        <div className="mt-3 text-sm text-white/70">
          選択: {file ? file.name : "なし"} / 全件: {rows.length}件 / 表示(プレビュー): {preview.length}件 /
          差分: {yen(previewSum)}
        </div>

        {msg ? <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">{msg}</div> : null}
        {err ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}
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
                    <td className="px-3 py-2">{r.section === "income" ? "収入" : "支出"}</td>
                    <td className="px-3 py-2 text-right">{yen(r.amount)}</td>
                    <td className="px-3 py-2 text-white/70">{r.memo ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-white/50">
          ※ Shift_JIS / Windows-31J / UTF-8 を自動判定してデコードしています
        </div>
      </div>
    </div>
  );
}