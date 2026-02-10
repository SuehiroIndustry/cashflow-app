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

function looksLikeRakutenHeaderCsv(text: string): boolean {
  const keys = ["日付", "取引日", "支払日", "入出金", "区分", "金額", "摘要", "内容", "メモ", "令和", "R"];
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

  for (const enc of ["shift_jis", "shift-jis", "windows-31j", "utf-8"]) {
    const t = safeDecodeWithTextDecoder(buf, enc);
    if (!t) continue;
    if (looksLikeRakutenHeaderCsv(t) || t.includes('"1","') || t.includes('"2","')) return t;
  }

  const uint8 = new Uint8Array(buf);

  const sjisToUnicode = Encoding.convert(uint8, {
    to: "UNICODE",
    from: "SJIS",
    type: "string",
  }) as string;

  if (sjisToUnicode && sjisToUnicode.length > 0) return sjisToUnicode.replace(/^\uFEFF/, "");

  const utf8ToUnicode = Encoding.convert(uint8, {
    to: "UNICODE",
    from: "UTF8",
    type: "string",
  }) as string;

  return utf8ToUnicode.replace(/^\uFEFF/, "");
}

/**
 * クォート内改行も扱える最小CSVパーサ
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
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes) {
      if (ch === ",") {
        pushField();
        continue;
      }
      if (ch === "\n") {
        pushField();
        pushRow();
        continue;
      }
      if (ch === "\r") {
        if (text[i + 1] === "\n") i++;
        pushField();
        pushRow();
        continue;
      }
    }

    field += ch;
  }

  pushField();
  if (row.length > 1 || row[0].trim() !== "") pushRow();

  return rows;
}

/**
 * YYMMDD -> YYYY-MM-DD（Zengin用）
 * ✅楽天のZenginは「令和YY」の可能性が高いので、令和を優先して西暦に寄せる
 */
function yymmddToIso(v: string): string | null {
  const s = (v ?? "").trim();
  if (!/^\d{6}$/.test(s)) return null;

  const yy = Number(s.slice(0, 2));
  const mm = Number(s.slice(2, 4));
  const dd = Number(s.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const currentYear = new Date().getFullYear();

  // 候補：令和(2018+yy) / 西暦(2000+yy) / 西暦(1900+yy)
  const candidates = [
    2018 + yy, // Reiwa: R1=2019
    2000 + yy,
    1900 + yy,
  ];

  // 未来に飛びすぎる年は除外（来年まで許容）
  const valid = candidates.filter((y) => y <= currentYear + 1);

  // 近い年を採用（なければ令和を採用）
  const picked =
    valid.length > 0
      ? valid.reduce((best, y) => (Math.abs(y - currentYear) < Math.abs(best - currentYear) ? y : best), valid[0])
      : 2018 + yy;

  return `${picked}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// 令和/平成など -> YYYY-MM-DD
function normalizeDateToISO(raw: string): string | null {
  const s0 = String(raw ?? "").trim();
  if (!s0) return null;

  const s = s0.replaceAll("年", "/").replaceAll("月", "/").replaceAll("日", "").trim();

  const m1 = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m1) {
    const yyyy = Number(m1[1]);
    const mm = Number(m1[2]);
    const dd = Number(m1[3]);
    if (yyyy >= 1900 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
  }

  const era = s.match(/^(R|令和|H|平成)\s*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (era) {
    const kind = era[1];
    const y = Number(era[2]);
    const mm = Number(era[3]);
    const dd = Number(era[4]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || y < 1) return null;

    let yyyy: number | null = null;
    if (kind === "R" || kind === "令和") yyyy = 2018 + y;
    if (kind === "H" || kind === "平成") yyyy = 1988 + y;

    if (!yyyy) return null;
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  return null;
}

function toIntSafeDigits(v: string): number | null {
  const s = String(v ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function parseRakutenCsv(file: File): Promise<Row[]> {
  const text = await readCsvText(file);
  const table = parseCsvAll(text);
  if (table.length === 0) return [];

  // 1) 全銀協(Zengin) 形式
  const hasZenginDetail = table.some((r) => (r?.[0] ?? "").trim() === "2");
  const firstType = (table[0]?.[0] ?? "").trim();

  if (hasZenginDetail && (firstType === "1" || firstType === "2")) {
    const out: Row[] = [];

    for (const r of table) {
      if ((r?.[0] ?? "").trim() !== "2") continue;

      const date =
        yymmddToIso(String(r[2] ?? "").trim()) ??
        yymmddToIso(String(r[3] ?? "").trim());

      const amountVal = toIntSafeDigits(String(r[6] ?? "").trim());

      if (!date || amountVal === null) continue;

      const inout = String(r[4] ?? "").trim();
      const section: Row["section"] = inout === "1" ? "income" : "expense";

      const name = String(r[14] ?? "").trim();
      const bank = String(r[15] ?? "").trim();
      const memo = [name, bank].filter(Boolean).join(" / ");

      out.push({
        date,
        section,
        amount: Math.abs(Math.trunc(amountVal)),
        memo,
      });
    }

    return out;
  }

  // 2) ヘッダあり通常CSV
  if (table.length <= 1) return [];

  const header = table[0].map((h) => String(h ?? "").replaceAll("\uFEFF", "").trim());

  const findIdx = (cands: string[]) =>
    header.findIndex((h) => cands.some((c) => h.includes(c)));

  const idxDate = findIdx(["日付", "取引日", "取引日付", "支払日"]);
  const idxInOut = findIdx(["入出金", "区分", "摘要区分"]);
  const idxAmount = findIdx(["金額", "入金額", "出金額"]);
  const idxMemo = findIdx(["摘要", "内容", "メモ", "取引内容"]);

  if (idxDate < 0 || idxAmount < 0) return [];

  const rows: Row[] = [];

  for (let i = 1; i < table.length; i++) {
    const cols = table[i];

    const dateRaw = (idxDate >= 0 ? cols[idxDate] : "") ?? "";
    const ioRaw = (idxInOut >= 0 ? cols[idxInOut] : "") ?? "";
    const amountRaw = (idxAmount >= 0 ? cols[idxAmount] : "") ?? "";
    const memoRaw = (idxMemo >= 0 ? cols[idxMemo] : "") ?? "";

    const date = normalizeDateToISO(String(dateRaw).replaceAll('"', "").trim());
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
          : "プレビュー対象がありません（CSV形式/日付形式/文字コードを確認してください）"
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

        <div className="mt-3 text-xs text-white/50">※ ZenginのYYMMDDは令和年の可能性があるため、西暦へ補正します</div>
      </div>
    </div>
  );
}