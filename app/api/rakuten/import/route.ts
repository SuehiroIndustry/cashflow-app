// app/api/rakuten/import/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import iconv from "iconv-lite";
import { parse } from "csv-parse/sync";
import crypto from "crypto";

export const runtime = "nodejs"; // iconv-lite を使うので Node ランタイム推奨

function toDateFromReiwaYYMMDD(s: string): string {
  // 例: "071104" => 令和7年11月04日 => 2025-11-04
  // 令和1年=2019年なので、2018 + yy
  const yy = Number(s.slice(0, 2));
  const mm = Number(s.slice(2, 4));
  const dd = Number(s.slice(4, 6));
  const year = 2018 + yy;
  const m = String(mm).padStart(2, "0");
  const d = String(dd).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const cashAccountId = Number(form.get("cashAccountId") ?? "2");
    if (!Number.isFinite(cashAccountId)) {
      return NextResponse.json({ error: "cashAccountId is invalid" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const text = iconv.decode(buf, "cp932"); // 楽天CSVはだいたいShift-JIS系

    // 全銀協フォーマットはヘッダ無し・クォート有りが多い
    const records: string[][] = parse(text, {
      relax_quotes: true,
      relax_column_count: true,
      skip_empty_lines: true,
    });

    // Supabase（Service Role）
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 認証ユーザーID（DB側で auth.uid() を使うので、ここは「rawに入れるuser_id」を form から渡す方式も可）
    // 今回は「raw.user_id は後段の RLS / auth.uid() と一致させたい」ので、クライアント側でログイン必須にして
    // user_id を一緒に送るのが最も事故が少ない。
    const userId = String(form.get("userId") ?? "");
    if (!userId || userId.length < 10) {
      return NextResponse.json(
        { error: "userId is required (send auth.uid())" },
        { status: 400 }
      );
    }

    // Zenginレコード種別:
    // "1": header, "2": detail(取引明細), "8/9": trailer など
    // 明細 "2" の配列例（今回のCSV実物から）:
    // [0]=2, [2]=取引日(YYMMDD:令和), [4]=入出金区分(1/2), [6]=金額, [14]=摘要(ｶﾅ), ...（合計20列）
    const rawRows = [];
    for (const r of records) {
      if (!r?.length) continue;
      if (r[0] !== "2") continue;

      const txn = (r[2] || "").trim(); // "071104"
      if (txn.length !== 6) continue;

      const txnDate = toDateFromReiwaYYMMDD(txn);

      const io = (r[4] || "").trim(); // "1" or "2"
      // 推定：2=入金, 1=出金（利息の極小金額が2側に出ていた）
      const direction = io === "2" ? "in" : "out";

      const amountStr = (r[6] || "").trim(); // "000000087600"
      const amount = Number(amountStr);
      if (!Number.isFinite(amount)) continue;

      const desc = (r[14] || "").trim(); // ｶﾅ摘要
      const description = desc;

      const rowHash = sha256Hex(`${userId}|${txnDate}|${direction}|${amount}|${description}`);

      rawRows.push({
        user_id: userId,
        imported_at: new Date().toISOString(),
        txn_date: txnDate,
        description,
        amount,
        direction,
        balance: null,
        row_hash: rowHash,
        created_at: new Date().toISOString(),
      });
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No detail records found (type=2)" }, { status: 400 });
    }

    // rawにUPSERT（重複は user_id+row_hash で弾く）
    const { error: rawErr } = await supabase
      .from("rakuten_bank_raw_transactions")
      .upsert(rawRows, { onConflict: "user_id,row_hash" });

    if (rawErr) {
      return NextResponse.json({ error: rawErr.message }, { status: 500 });
    }

    // cash_flows へ反映（RPC）
    const { data: inserted, error: rpcErr } = await supabase.rpc(
      "import_rakuten_raw_to_cash_flows",
      { p_cash_account_id: cashAccountId }
    );

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      raw_rows_received: rawRows.length,
      cash_flows_inserted: inserted ?? 0,
      cash_account_id: cashAccountId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}