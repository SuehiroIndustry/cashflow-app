// app/dashboard/import/ImportClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { importCashFlowsFromRows } from "./_actions/importCashFlowsFromRows";

type AccountRow = {
  id: number;
  name: string;
};

type ParsedRow = {
  date: string; // YYYY-MM-DD
  section: "income" | "expense";
  amount: number;
  description: string;
  raw?: string;
};

type Props = {
  cashAccountId: number | null;
  accounts: AccountRow[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function yymmddToISO(yymmdd: string): string | null {
  const s = (yymmdd ?? "").trim();
  if (!/^\d{6}$/.test(s)) return null;
  const yy = Number(s.slice(0, 2));
  const mm = Number(s.slice(2, 4));
  const dd = Number(s.slice(4, 6));
  if (!(mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31)) return null;
  const yyyy = 2000 + yy; // 20xx 前提（楽天の出力的にOK）
  return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
}

/**
 * CSV（クォート/改行/カンマ対応）の最小パーサ
 * - 返り値：2次元配列（row -> cols）
 */
function parseCSV(text: string, delimiter: "," | "\t"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // escaped quote
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      row.push(cur);
      cur = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      continue;
    }

    if (ch === "\r") {
      // ignore
      continue;
    }

    cur += ch;
  }

  // last
  row.push(cur);
  rows.push(row);

  // trim end empty line
  while (rows.length && rows[rows.length - 1].every((c) => (c ?? "").trim() === "")) {
    rows.pop();
  }

  return rows;
}

function guessDelimiter(text: string): "," | "\t" {
  const comma = (text.match(/,/g) ?? []).length;
  const tab = (text.match(/\t/g) ?? []).length;
  return tab > comma ? "\t" : ",";
}

function normalize(s: string) {
  return (s ?? "").replace(/\uFEFF/g, "").trim();
}

function isZenginLike(rows: string[][]): boolean {
  const first = rows.find((r) => r.some((c) => normalize(c) !== ""));
  if (!first) return false;
  const t = normalize(first[0]);
  return t === "1" || t === "2";
}

function parseZengin(rows: string[][]): ParsedRow[] {
  // record type "2" = detail
  const details = rows.filter((r) => normalize(r[0]) === "2");

  const out: ParsedRow[] = [];
  for (const r of details) {
    // だいたい： [0]=2, [2]=取引日(YYMMDD), [4]=入出金(1/2), [6]=金額(ゼロ埋め), [15]=摘要
    const dateISO = yymmddToISO(normalize(r[2]));
    if (!dateISO) continue;

    const kbn = normalize(r[4]); // 1 or 2
    const amountStr = normalize(r[6]).replace(/^0+/, "") || "0";
    const amount = Number(amountStr);

    if (!Number.isFinite(amount)) continue;

    const section: "income" | "expense" = kbn === "2" ? "income" : "expense";

    const descBase = normalize(r[15] ?? "");
    const desc2 = normalize(r[16] ?? "");
    const desc3 = normalize(r[14] ?? "");
    const description = [descBase, desc2, desc3].filter(Boolean).join(" ").trim() || "-";

    out.push({
      date: dateISO,
      section,
      amount,
      description,
      raw: r.join(","),
    });
  }

  return out;
}

export default function ImportClient({ cashAccountId, accounts }: Props) {
  const router = useRouter();

  const [fileName, setFileName] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [rows, setRows] = useState<string[][]>([]);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<string>("");

  const effectiveCashAccountId = cashAccountId;

  const accountName = useMemo(() => {
    if (!effectiveCashAccountId) return "（未指定）";
    return accounts.find((a) => a.id === effectiveCashAccountId)?.name ?? `ID:${effectiveCashAccountId}`;
  }, [accounts, effectiveCashAccountId]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResultMsg("");
    setParsed([]);
    setRows([]);
    setRawText("");

    const f = e.target.files?.[0];
    if (!f) return;

    setFileName(f.name);

    const text = await f.text();
    setRawText(text);

    const delimiter = guessDelimiter(text);
    const r = parseCSV(text, delimiter);
    setRows(r);

    if (!effectiveCashAccountId) {
      setError("cashAccountId が決められていません（URLに ?cashAccountId= を付けるか、口座が取得できているか確認）");
      return;
    }

    // Zengin
    if (isZenginLike(r)) {
      const p = parseZengin(r);
      if (!p.length) {
        setError("Zengin形式として読めましたが、明細レコード（種別=2）が取れませんでした。");
        return;
      }
      setParsed(p);
      return;
    }

    // ここから先は「ヘッダありCSV」用（将来用）
    setError("このCSVは未対応です（Zengin形式ではありません）。いまは RB-torihikimeisai-zengin.csv のみ対応しています。");
  }

  async function onImport() {
    setError("");
    setResultMsg("");

    if (!effectiveCashAccountId) {
      setError("cashAccountId がありません。");
      return;
    }
    if (!parsed.length) {
      setError("取り込み対象がありません。");
      return;
    }

    setBusy(true);
    try {
      const res = await importCashFlowsFromRows({
        cashAccountId: effectiveCashAccountId,
        rows: parsed.map((p) => ({
          date: p.date,
          section: p.section,
          amount: p.amount,
          description: p.description,
        })),
      });

      if (!res.ok) {
        setError(res.error ?? "インポートに失敗しました。");
      } else {
        setResultMsg(`インポート完了：${res.inserted ?? 0}件`);
      }
    } catch (e: any) {
      setError(e?.message ?? "インポートで例外が発生しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-6 text-zinc-200">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="text-xl font-semibold">楽天銀行・明細インポート</div>
        <div className="mt-1 text-sm text-zinc-400">
          CSV/TSV をアップロードして、内容を確認してから取り込みます（Zengin形式対応）。
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <div>
            <span className="text-zinc-400">口座:</span>{" "}
            <span className="font-semibold text-zinc-100">{accountName}</span>
          </div>
          <div>
            <span className="text-zinc-400">cashAccountId:</span>{" "}
            <span className="font-mono text-zinc-100">{String(effectiveCashAccountId ?? "null")}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="text-sm font-semibold">ファイルアップロード</div>

        <div className="mt-3 flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800">
            <input
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              className="hidden"
              onChange={onPickFile}
            />
            ファイルを選択
          </label>

          <div className="text-sm text-zinc-300">
            {fileName ? `選択中: ${fileName}` : "未選択"}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {resultMsg && (
          <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">
            {resultMsg}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
          >
            ダッシュボードへ戻る
          </button>

          <button
            onClick={onImport}
            disabled={busy || !parsed.length || !effectiveCashAccountId}
            className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "インポート中..." : "インポート実行"}
          </button>

          <div className="text-xs text-zinc-400">
            {parsed.length ? `取り込み対象: ${parsed.length}件` : "まずファイルを選択してください"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="text-sm font-semibold">プレビュー（先頭50件）</div>

        {!parsed.length ? (
          <div className="mt-3 text-sm text-zinc-400">まだデータがありません（ファイルを選択してください）</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-300">
                  <th className="px-2 py-2 text-left font-semibold">日付</th>
                  <th className="px-2 py-2 text-left font-semibold">区分</th>
                  <th className="px-2 py-2 text-right font-semibold">金額</th>
                  <th className="px-2 py-2 text-left font-semibold">摘要</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 50).map((p, idx) => (
                  <tr key={idx} className="border-b border-zinc-900">
                    <td className="px-2 py-2 text-left text-zinc-100">{p.date}</td>
                    <td className="px-2 py-2 text-left text-zinc-100">
                      {p.section === "income" ? "収入" : "支出"}
                    </td>
                    <td className="px-2 py-2 text-right text-zinc-100 tabular-nums">
                      {p.amount.toLocaleString("ja-JP")} 円
                    </td>
                    <td className="px-2 py-2 text-left text-zinc-100">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 text-xs text-zinc-500">
              ※Zengin形式はヘッダ行が無いため、列名検索ではなく「レコード種別=2」から抽出しています。
            </div>
          </div>
        )}
      </div>

      {/* デバッグ用：必要なら表示 */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="text-sm font-semibold">デバッグ（読み取り状況）</div>
        <div className="mt-2 text-xs text-zinc-400">
          delimiter 推定: {rawText ? guessDelimiter(rawText) : "-"} / rows: {rows.length} / parsed:{" "}
          {parsed.length}
        </div>
      </div>
    </div>
  );
}