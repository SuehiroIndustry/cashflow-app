// app/dashboard/import/ImportClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Encoding from "encoding-japanese";

import { importRakutenCsv } from "./_actions/importRakutenCsv";
import type { Row } from "./_actions/importRakutenCsv";

type Props = {
  cashAccountId: number; // 2固定
};

function yen(n: number) {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

function looksLikeRakutenCsv(text: string): boolean {
  const keys = ["日付", "取引日", "支払日", "入出金", "区分", "金額", "摘要", "内容", "メモ"];
  return keys.some((k) => text.includes(k));
}

function safeDecodeWithTextDecoder(buf: ArrayBuffer, enc: string): string | null {
  try {
    const td = new TextDecoder(enc as any);
    return td.decode(buf).replace(/^\uFEFF/, "");
  } catch {
    return null;
  }
}

async function readCsvText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();

  // 速い経路：TextDecoderで当たりを引けるならそれでOK
  for (const enc of ["shift_jis", "shift-jis", "windows-31j", "utf-8"]) {
    const t = safeDecodeWithTextDecoder(buf, enc);
    if (t && looksLikeRakutenCsv(t)) return t;
  }

  // 保険：Shift_JIS未対応ブラウザでも確実に読む
  const uint8 = new Uint8Array(buf);

  const sjisToUnicode = Encoding.convert(uint8, {
    to: "UNICODE",
    from: "SJIS",
    type: "string",
  }) as string;

  if (looksLikeRakutenCsv(sjisToUnicode)) {
    return sjisToUnicode.replace(/^\uFEFF/, "");
  }

  const utf8ToUnicode = Encoding.convert(uint8, {
    to: "UNICODE",
    from: "UTF8",
    type: "string",
  }) as string;

  return utf8ToUnicode.replace(/^\uFEFF/, "");
}

/**
 * ✅ 改行を含むクォートフィールド対応のCSVパーサ（最小実装）
 * - 区切り: ,
 * - クォート: "
 * - CRLF / LF / CR すべて対応
 * - クォート内の改行は「データ」として保持
 */
function parseCsvAll(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    // 空行っぽいのは落とす（全部空のときだけ）
    if (row.length === 1 && row[0].trim() === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      // "" -> "
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes) {
      // delimiter
      if (ch === ",") {
        pushField();
        continue;
      }

      // newline (CRLF / LF / CR)
      if (ch === "\n") {
        pushField();
        pushRow();
        continue;
      }
      if (ch === "\r") {
        // CRLFの場合は次の\nを飛ばす
        if (text[i + 1] === "\n") i++;
        pushField();
        pushRow();
        continue;
      }
    }

    // normal char (クォート内の改行もここで入る)
    field += ch;
  }

  // last
  pushField();
  // 末尾が改行で終わってない場合の行を追加
  if (row.length > 1 || row[0].trim() !== "") pushRow();

  // trimは後段でやる
  return rows;
}

async function parseRakutenCsv(file: File): Promise<Row[]> {
  const text = await readCsvText(file);

  const table = parseCsvAll(text);
  if (table.length <= 1) return [];

  const header = table[0].map((h) => String(h ?? "").replaceAll("\uFEFF", "").trim());

  const findIdx = (cands: string[]) =>
    header.findIndex((h) => cands.some((c) => h.includes(c)));

  const idxDate = findIdx(["日付", "取引日", "取引日付", "支払日"]);
  const idxInOut = findIdx(["入出金", "区分", "摘要区分"]);
  const idxAmount = findIdx(["金額", "入金額", "出金額"]);
  const idxMemo = findIdx(["摘要", "内容", "メモ", "取引内容"]);

  // ヘッダが取れないなら0件
  if (idxDate < 0 || idxAmount < 0) return [];

  const rows: Row[] = [];

  for (let i = 1; i < table.length; i++) {
    const cols = table[i];

    const dateRaw = (idxDate >= 0 ? cols[idxDate] : "") ?? "";
    const ioRaw = (idxInOut >= 0 ? cols[idxInOut] : "") ?? "";
    const amountRaw = (idxAmount >= 0 ? cols[idxAmount] : "") ?? "";
    const memoRaw = (idxMemo >= 0 ? cols[idxMemo] : "") ?? "";

    const date = String(dateRaw).replaceAll("/", "-").replaceAll('"', "").trim();

    const amount = Number(
      String(amountRaw).replaceAll('"', "").replaceAll(",", "").replaceAll("円", "").trim() || 0
    );

    if (!date || !Number.isFinite(amount)) continue;

    const io = String(ioRaw).replaceAll('"', "").trim();
    const section: Row["section"] =
      io.includes("入") || io.toLowerCase().includes("in") ? "income" : "expense";

    rows.push({
      date,
      section,
      amount: Math.abs(Math.trunc(amount)),
      memo: String(memoRaw ?? "").replaceAll('"', "").trim(),
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

        <div className="mt-3 text-xs text-white/50">※ クォート内改行を含むCSVにも対応しています</div>
      </div>
    </div>
  );
}