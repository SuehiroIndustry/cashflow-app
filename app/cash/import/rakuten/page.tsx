// app/cash/import/rakuten/page.tsx
import { revalidatePath } from "next/cache";

// ★ここだけ、君のプロジェクトに合わせて調整してOK
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ParsedRow = {
  txn_date: string | null;      // YYYY-MM-DD
  description: string;
  amount: number | null;
  direction: "in" | "out" | null;
  balance: number | null;
  row_hash: string;
};

// ざっくりでも壊れにくいCSVパーサ（ダブルクォート対応）
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"' ) {
      if (inQuotes && next === '"') {
        cur += '"'; // "" => "
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && c === ",") {
      row.push(cur);
      cur = "";
      continue;
    }

    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && next === "\n") i++;
      row.push(cur);
      cur = "";
      // 空行は捨てる
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    cur += c;
  }

  row.push(cur);
  if (row.some((v) => v.trim() !== "")) rows.push(row);

  return rows;
}

function normalizeNumber(s: string): number | null {
  const t = (s ?? "").toString().trim();
  if (!t) return null;
  // "1,234" / "▲1,234" / "-1,234" などを吸収
  const cleaned = t.replace(/,/g, "").replace(/^▲/, "-");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toIsoDateMaybe(s: string): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;

  // 期待：2026/01/30 など
  const m1 = t.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m1) {
    const yyyy = m1[1];
    const mm = String(m1[2]).padStart(2, "0");
    const dd = String(m1[3]).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // 期待：20260130 など
  const m2 = t.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;

  return null;
}

function simpleHash(s: string): string {
  // 依存なし簡易ハッシュ（衝突はゼロではないが重複検知には十分）
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function parseRakutenRows(csvText: string): ParsedRow[] {
  const table = parseCsv(csvText);

  // 楽天のCSVは先頭にヘッダがあることが多いので雑にスキップ判定
  // 日付っぽい値が最初の列にない行はヘッダ扱いで捨てる
  const body = table.filter((r) => toIsoDateMaybe(r?.[0] ?? "") !== null);

  return body.map((r) => {
    // 想定カラム（楽天の形式により揺れるので “それっぽい” を拾う）
    // 0: 日付, 1: 内容, 2: 出金, 3: 入金, 4: 残高 みたいな形式が多い
    const date = toIsoDateMaybe(r[0] ?? "");
    const description = (r[1] ?? "").trim();

    const out = normalizeNumber(r[2] ?? "");
    const inn = normalizeNumber(r[3] ?? "");
    const balance = normalizeNumber(r[4] ?? "");

    let amount: number | null = null;
    let direction: "in" | "out" | null = null;

    if (inn !== null && inn !== 0) {
      amount = inn;
      direction = "in";
    } else if (out !== null && out !== 0) {
      amount = out;
      direction = "out";
    } else {
      // どっちも0/空の時は amount 不明
      amount = null;
      direction = null;
    }

    const normalized = [
      date ?? "",
      description,
      direction ?? "",
      amount ?? "",
      balance ?? "",
    ].join("|");

    return {
      txn_date: date,
      description,
      amount,
      direction,
      balance,
      row_hash: simpleHash(normalized),
    };
  });
}

async function uploadRakutenCsv(formData: FormData): Promise<void> {
  "use server";

  const file = formData.get("file");
  if (!(file instanceof File)) return;

  const text = await file.text();
  const parsed = parseRakutenRows(text);

  if (parsed.length === 0) return;

  const supabase = await createClient();

  // auth.uid() を RLS で使うので、サーバ側は user を取って明示的に user_id を入れる
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return;

  const rowsToInsert = parsed
    .filter((r) => r.txn_date && r.description)
    .map((r) => ({
      user_id: user.id,
      txn_date: r.txn_date,
      description: r.description,
      amount: r.amount,
      direction: r.direction,
      balance: r.balance,
      row_hash: r.row_hash,
    }));

  // 重複は unique(user_id,row_hash) で弾く
  // supabase-js の upsert でもいいけど、まずは insert でOK
  const { error } = await supabase
    .from("rakuten_bank_raw_transactions")
    .insert(rowsToInsert);

  // 重複で落ちる場合があるので、必要ならここを upsert に変える
  if (error) {
    // ここで throw すると画面が死ぬので、まずは黙って戻す（後でUI改善）
    return;
  }

  revalidatePath("/cash/import/rakuten");
}

export default async function Page() {
  // 最新の取り込み状況を表示
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let recent: any[] = [];
  if (user) {
    const { data } = await supabase
      .from("rakuten_bank_raw_transactions")
      .select("txn_date, description, direction, amount, balance, imported_at")
      .eq("user_id", user.id)
      .order("imported_at", { ascending: false })
      .limit(20);

    recent = data ?? [];
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>楽天銀行 明細CSVアップロード</h1>

      <form action={uploadRakutenCsv} style={{ marginTop: 16 }}>
        <input type="file" name="file" accept=".csv,text/csv" required />
        <button type="submit" style={{ marginLeft: 12 }}>
          アップロード
        </button>
      </form>

      <div style={{ marginTop: 32 }}>
        <h2>直近の取り込み（最新20件）</h2>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          ※ まずは「保存できているか」確認用。見た目は後で整える。
        </div>

        <table border={1} cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>日付</th>
              <th>内容</th>
              <th>入出</th>
              <th>金額</th>
              <th>残高</th>
              <th>取込日時</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={6}>まだデータがありません</td>
              </tr>
            ) : (
              recent.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.txn_date ?? ""}</td>
                  <td>{r.description ?? ""}</td>
                  <td>{r.direction ?? ""}</td>
                  <td>{r.amount ?? ""}</td>
                  <td>{r.balance ?? ""}</td>
                  <td>{r.imported_at ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}