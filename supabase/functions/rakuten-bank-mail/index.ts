// supabase/functions/rakuten-bank-mail/index.ts
// ログを確実に出す版（まずは疎通と観測を安定させる）
//
// 期待する呼び出し元:
// - Google Apps Script から POST
// - header: X-Webhook-Secret: <SECRET>
// - JSON body: { from, subject, date, body } など

type IncomingPayload = {
  from?: string;
  subject?: string;
  date?: string; // ISO string想定
  body?: string;
  [key: string]: unknown;
};

function jsonResponse(
  status: number,
  data: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function safePreview(value: unknown, maxLen = 800): string {
  try {
    const s =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen) + `... (truncated, len=${s.length})`;
  } catch {
    return String(value);
  }
}

Deno.serve(async (req: Request) => {
  const startedAt = Date.now();
  const reqId = crypto.randomUUID();

  // ---- 基本メタログ（ここが出れば Logs タブが埋まる）----
  console.log(`[${reqId}] rakuten-bank-mail: called`);
  console.log(`[${reqId}] method=${req.method} url=${req.url}`);

  // ---- CORS（必要なら。Apps Script なら基本不要だが安全に）----
  if (req.method === "OPTIONS") {
    console.log(`[${reqId}] OPTIONS preflight`);
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "content-type, x-webhook-secret, authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    console.warn(`[${reqId}] rejected: method not allowed`);
    return jsonResponse(405, { ok: false, error: "Method Not Allowed" }, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  // ---- Secret 検証 ----
  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  const expectedSecret = Deno.env.get("WEBHOOK_SECRET") ?? "";

  if (!expectedSecret) {
    // Secrets 未設定が一発でわかるログ
    console.error(
      `[${reqId}] WEBHOOK_SECRET is not set in Supabase Secrets`,
    );
    return jsonResponse(500, { ok: false, error: "Server secret not set" }, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  if (providedSecret !== expectedSecret) {
    console.warn(
      `[${reqId}] forbidden: secret mismatch (got len=${providedSecret.length})`,
    );
    return jsonResponse(403, { ok: false, error: "Forbidden" }, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  // ---- Payload パース（壊れてても落とさない）----
  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
  let payload: IncomingPayload | null = null;
  let rawText: string | null = null;

  try {
    if (contentType.includes("application/json")) {
      payload = (await req.json()) as IncomingPayload;
    } else {
      rawText = await req.text();
      // JSONっぽければパース試行
      try {
        payload = JSON.parse(rawText) as IncomingPayload;
      } catch {
        payload = { raw: rawText } as IncomingPayload;
      }
    }
  } catch (e) {
    console.error(`[${reqId}] payload parse failed`, e);
    return jsonResponse(400, { ok: false, error: "Bad Request" }, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  // ---- 受信内容ログ（長すぎると見づらいのでプレビュー）----
  console.log(
    `[${reqId}] payload preview:\n${safePreview(payload)}`,
  );

  // ---- よく使うフィールドを整形してログ ----
  const from = String(payload?.from ?? "");
  const subject = String(payload?.subject ?? "");
  const date = String(payload?.date ?? "");
  const body = String(payload?.body ?? "");

  console.log(`[${reqId}] parsed: from="${from}" subject="${subject}" date="${date}"`);
  console.log(`[${reqId}] body preview:\n${safePreview(body, 600)}`);

  // ---- ここにDB書き込み等を入れる ----
  // TODO: 既存のDB保存処理があるならここへ移植する
  // 例）supabase client で insert するなど
  // console.log(`[${reqId}] db insert start`);
  // ...insert...
  // console.log(`[${reqId}] db insert done`);

  const elapsedMs = Date.now() - startedAt;
  console.log(`[${reqId}] done: ${elapsedMs}ms`);

  return jsonResponse(200, { ok: true, reqId, elapsedMs }, {
    "Access-Control-Allow-Origin": "*",
  });
});