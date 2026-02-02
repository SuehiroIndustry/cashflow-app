// app/dashboard/import/ImportClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { importCashFlowsFromRows } from "./_actions/importCashFlows";

type ParsedRow = {
  date: string; // YYYY-MM-DD
  section: "income" | "expense";
  amount: number; // positive
  description: string;
};

function toInt(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function stripBOM(s: string) {
  return s.replace(/^\uFEFF/, "");
}

function normalizeDate(s: string): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;

  // 2026/01/31 or 2026-01-31
  const m = t.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) {
    const y = m[1];
    const mm = String(Number(m[2])).padStart(2, "0");
    const dd = String(Number(m[3])).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  return null;
}

function parseNumber(s: string): number {
  const t = (s ?? "").replace(/,/g, "").trim();
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function splitLines(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
}

/**
 * ✅ 引用符対応の1行パーサ（CSV/TSV）
 * - "a,b" を1セルとして扱う
 * - "" を " として扱う
 */
function parseDelimitedLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        // escaped quote
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out.map((s) => stripBOM(s));
}

function detectDelimiter(line: string) {
  // tab優先（TSV）
  if (line.includes("\t") && !line.includes(",")) return "\t";
  // CSV
  return ",";
}

function mapHeaders(headers: string[]) {
  const h = headers.map((x) => (x ?? "").trim());

  const idx = (candidates: string[]) =>
    h.findIndex((x) => candidates.some((k) => x === k || x.includes(k)));

  // ✅ 日付表記ゆれを増やす
  const dateIdx = idx([
    "日付",
    "取引日",
    "年月日",
    "利用日",
    "Date",
    "date",
  ]);

  const descIdx = idx([
    "摘要",
    "内容",
    "摘要内容",
    "取引内容",
    "Description",
    "description",
  ]);

  // ✅ 入出金表記ゆれを増やす（楽天CSVでありがち）
  const inIdx = idx([
    "預り金額",
    "入金",
    "入金額",
    "受取金額",
    "credit",
    "income",
  ]);

  const outIdx = idx([
    "支払金額",
    "出金",
    "出金額",
    "支払",
    "debit",
    "expense",
  ]);

  return { dateIdx, descIdx, inIdx, outIdx };
}

/**
 * ✅ 先頭N行から「ヘッダ行」を探す
 * 条件：日付列があり、かつ入金/出金のどちらかがある
 */
function findHeader(lines: string[], maxScan = 20) {
  const scan = Math.min(lines.length, maxScan);

  for (let i = 0; i < scan; i++) {
    const line = lines[i];
    const delimiter = detectDelimiter(line);
    const headers = parseDelimitedLine(line, delimiter);
    const { dateIdx, inIdx, outIdx } = mapHeaders(headers);

    if (dateIdx >= 0 && (inIdx >= 0 || outIdx >= 0)) {
      return { headerIndex: i, delimiter, headers };
    }
  }

  // 見つからない場合、1行目を参考情報として返す
  const delimiter = detectDelimiter(lines[0] ?? "");
  const headers = parseDelimitedLine(lines[0] ?? "", delimiter);
  return { headerIndex: -1, delimiter, headers };
}

export default function ImportClient(props: { cashAccountId: number | null }) {
  const sp = useSearchParams();

  const cashAccountId = useMemo(() => {
    if (typeof props.cashAccountId === "number") return props.cashAccountId;
    const fromUrl = sp.get("cashAccountId");
    return toInt(fromUrl);
  }, [props.cashAccountId, sp]);

  const [fileName, setFileName] = useState("");
  const [rawError, setRawError] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  // ✅ デバッグ表示用（どの行がヘッダ扱いになったか）
  const [debug, setDebug] = useState<{
    headerIndex: number;
    delimiter: string;
    headers: string[];
    firstLines: string[];
  } | null>(null);

  const canImport = !!cashAccountId && rows.length > 0 && !busy;

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setRawError("");
    setResultMsg("");
    setRows([]);
    setDebug(null);

    const f = e.target.files?.[0];
    if (!f) return;

    setFileName(f.name);

    const text = await f.text();
    const lines = splitLines(text);
    if (lines.length < 2) {
      setRawError("ファイルの行数が足りません（ヘッダ＋データが必要）。");
      return;
    }

    const headerInfo = findHeader(lines, 20);
    setDebug({
      headerIndex: headerInfo.headerIndex,
      delimiter: headerInfo.delimiter === "\t" ? "\\t" : headerInfo.delimiter,
      headers: headerInfo.headers,
      firstLines: lines.slice(0, 5),
    });

    if (headerInfo.headerIndex < 0) {
      setRawError(
        "ヘッダに日付列が見つかりません。ファイル先頭に説明行が入っているか、ヘッダ名が想定外です（下のデバッグ表示を見てください）。"
      );
      return;
    }

    const headers = headerInfo.headers;
    const { dateIdx, descIdx, inIdx, outIdx } = mapHeaders(headers);

    // 念のため（findHeaderで保証してるが）
    if (dateIdx < 0) {
      setRawError("ヘッダに日付列が見つかりません（例: 日付 / 取引日 / 年月日）。");
      return;
    }
    if (inIdx < 0 && outIdx < 0) {
      setRawError("入金/出金の列が見つかりません（例: 預り金額 / 支払金額）。");
      return;
    }

    const parsed: ParsedRow[] = [];
    const delimiter = headerInfo.delimiter;

    for (let i = headerInfo.headerIndex + 1; i < lines.length; i++) {
      const cols = parseDelimitedLine(lines[i], delimiter);
      if (!cols.length) continue;

      const date = normalizeDate(cols[dateIdx] ?? "");
      if (!date) continue;

      const description = descIdx >= 0 ? (cols[descIdx] ?? "").trim() : "";

      const income = inIdx >= 0 ? parseNumber(cols[inIdx] ?? "") : 0;
      const expense = outIdx >= 0 ? parseNumber(cols[outIdx] ?? "") : 0;

      if (income === 0 && expense === 0) continue;

      if (income > 0) {
        parsed.push({ date, section: "income", amount: Math.abs(income), description });
      } else if (expense > 0) {
        parsed.push({ date, section: "expense", amount: Math.abs(expense), description });
      }
    }

    if (!parsed.length) {
      setRawError("取り込める行がありませんでした（0円行/日付不正など）。");
      return;
    }

    setRows(parsed);
  }

  async function onImport() {
    setRawError("");
    setResultMsg("");

    if (!cashAccountId) {
      setRawError("cashAccountId が未指定です（URLに ?cashAccountId=2 が必要）。");
      return;
    }

    setBusy(true);
    try {
      const res = await importCashFlowsFromRows({ cashAccountId, rows });

      if (!res.ok) {
        setRawError(res.error ?? "インポートに失敗しました。");
      } else {
        setResultMsg(`インポート完了：${res.inserted}件`);
      }
    } catch (e: any) {
      setRawError(e?.message ?? "インポートで例外が発生しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
        <div className="text-sm">
          <div className="text-zinc-400">cashAccountId（final）</div>
          <div className="mt-1 font-mono text-zinc-100">
            {cashAccountId ?? "（未指定）"}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">ファイルアップロード</div>
            <div className="mt-1 text-xs text-zinc-400">CSV/TSV 対応（引用符も対応）</div>
          </div>

          <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800">
            <input
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              className="hidden"
              onChange={onPickFile}
            />
            ファイルを選択
          </label>
        </div>

        {fileName ? (
          <div className="mt-3 text-sm text-zinc-300">
            選択中: <span className="font-mono">{fileName}</span>
          </div>
        ) : null}

        {rawError ? (
          <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
            {rawError}
          </div>
        ) : null}

        {resultMsg ? (
          <div className="mt-4 rounded-md border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-200">
            {resultMsg}
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onImport}
            disabled={!canImport}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-800"
          >
            {busy ? "取り込み中..." : "インポート実行"}
          </button>

          {!cashAccountId ? (
            <div className="text-xs text-zinc-400">※ URLの cashAccountId が取れていません</div>
          ) : null}
        </div>
      </div>

      {/* ✅ デバッグ表示（原因即特定） */}
      {debug ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200 space-y-3">
          <div className="text-sm font-semibold">デバッグ（読み取り状況）</div>
          <div className="text-sm text-zinc-400">
            headerIndex: <span className="font-mono text-zinc-200">{debug.headerIndex}</span>{" "}
            / delimiter: <span className="font-mono text-zinc-200">{debug.delimiter}</span>
          </div>
          <div className="text-xs text-zinc-400">先頭5行（参考）</div>
          <pre className="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{debug.firstLines.join("\n")}
          </pre>
          <div className="text-xs text-zinc-400">検出したヘッダ（参考）</div>
          <pre className="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{debug.headers.join(" | ")}
          </pre>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
        <div className="text-sm font-semibold">プレビュー（先頭50件）</div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="py-2 text-left">日付</th>
                <th className="py-2 text-left">区分</th>
                <th className="py-2 text-right">金額</th>
                <th className="py-2 text-left">摘要</th>
              </tr>
            </thead>
            <tbody className="text-zinc-200">
              {rows.slice(0, 50).map((r, idx) => (
                <tr key={`${r.date}-${idx}`} className="border-t border-zinc-800">
                  <td className="py-2">{r.date}</td>
                  <td className="py-2">{r.section === "income" ? "収入" : "支出"}</td>
                  <td className="py-2 text-right tabular-nums">
                    {r.amount.toLocaleString("ja-JP")} 円
                  </td>
                  <td className="py-2">{r.description || "-"}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="py-4 text-zinc-500" colSpan={4}>
                    まだデータがありません（ファイルを選択してください）
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {rows.length > 50 ? (
          <div className="mt-2 text-xs text-zinc-400">
            ※ {rows.length}件中、先頭50件のみ表示
          </div>
        ) : null}
      </div>
    </div>
  );
}