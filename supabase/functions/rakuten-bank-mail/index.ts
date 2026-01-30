// supabase/functions/rakuten-bank-mail/index.ts
// 楽天銀行「入金がありました」メール（Apps Script経由）を受け取り、ログ出し＆DBに保存する

import { createClient } from "npm:@supabase/supabase-js@2";

type Payload = {
  from?: string;
  subject?: string;
  date?: string; // ISO string expected from GAS
  body?: string;
};

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function safeHeaderValue(headers: Headers, key: string) {
  const v = headers.get(key);
  if (!v) return null;

  // 露出させたくないやつはマスク
  const k = key.toLowerCase();
  if (k.includes("secret") || k.includes("authorization") || k.includes("apikey")) {
    if (v.length <= 8) return "****";
    return v.slice(0, 4) + "****" + v.slice(-4);
  }
  return v;
}

function collectHeaders(headers: Headers) {
  // 主要なものだけ拾ってjson化（全部は重いし危険）
  const keys = [
    "content-type",
    "user-agent",
    "x-webhook-secret",
    "authorization",
    "apikey",
    "x-forwarded-for",
    "cf-connecting-ip",
  ];
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = safeHeaderValue(headers, k);
  return out;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const started = Date.now();

  // GASからは基本POST。OPTIONSも返しておく（保険）
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, x-webhook-secret, authorization, apikey",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    console.log("[rakuten-bank-mail] rejected: method not allowed", { requestId, method: req.method });
    return json({ ok: false, requestId, error: "Method Not Allowed" }, 405);
  }

  const envSupabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const envServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const expectedWebhookSecret = Deno.env.get("RAKUTEN_WEBHOOK_SECRET") ?? "";

  // ここが空だと、そもそも設定ミス
  if (!envSupabaseUrl || !envServiceRoleKey) {
    console.error("[rakuten-bank-mail] missing env for supabase client", {
      requestId,
      hasUrl: !!envSupabaseUrl,
      hasServiceKey: !!envServiceRoleKey,
    });
    return json({ ok: false, requestId, error: "Server misconfigured: missing SUPABASE env" }, 500);
  }

  // まず「届いてる」ログ（最重要）
  const url = new URL(req.url);
  const headerDump = collectHeaders(req.headers);
  console.log("[rakuten-bank-mail] called", {
    requestId,
    method: req.method,
    path: url.pathname,
    contentType: req.headers.get("content-type"),
    headers: headerDump,
  });

  // webhook secretチェック（Authorizationは要らない。GASが401出してたのはここが原因）
  const providedWebhookSecret = req.headers.get("X-Webhook-Secret") ?? "";
  const secretCheck = {
    requestId,
    expectedSet: expectedWebhookSecret.length > 0,
    providedSet: providedWebhookSecret.length > 0,
    match: expectedWebhookSecret.length > 0 && providedWebhookSecret === expectedWebhookSecret,
  };
  console.log("[rakuten-bank-mail] secret check", secretCheck);

  if (!expectedWebhookSecret) {
    console.error("[rakuten-bank-mail] missing env RAKUTEN_WEBHOOK_SECRET", { requestId });
    return json({ ok: false, requestId, error: "Server misconfigured: missing webhook secret" }, 500);
  }

  if (providedWebhookSecret !== expectedWebhookSecret) {
    console.warn("[rakuten-bank-mail] unauthorized: secret mismatch", {
      requestId,
      provided: providedWebhookSecret ? "set" : "empty",
    });
    return json({ ok: false, requestId, error: "Unauthorized" }, 401);
  }

  // body 読み取り
  const raw = await req.text();
  console.log("[rakuten-bank-mail] body received", { requestId, bytes: raw.length });

  let payload: Payload | null = null;
  try {
    payload = raw ? (JSON.parse(raw) as Payload) : null;
  } catch (e) {
    console.error("[rakuten-bank-mail] invalid json", { requestId, err: String(e) });
    return json({ ok: false, requestId, error: "Invalid JSON" }, 400);
  }

  // payloadのサマリログ（長文は切る）
  const bodyLen = payload?.body?.length ?? 0;
  console.log("[rakuten-bank-mail] payload summary", {
    requestId,
    from: payload?.from ?? null,
    subject: payload?.subject ?? null,
    date: payload?.date ?? null,
    bodyLen,
  });

  // DB保存（検証用テーブル）
  const supabase = createClient(envSupabaseUrl, envServiceRoleKey, {
    auth: { persistSession: false },
  });

  const mailDate = payload?.date ? new Date(payload.date) : null;
  const insertRow = {
    request_id: requestId,
    mail_from: payload?.from ?? null,
    mail_subject: payload?.subject ?? null,
    mail_date: mailDate && !isNaN(mailDate.getTime()) ? mailDate.toISOString() : null,
    mail_body: payload?.body ?? null,
    raw_payload: payload,
    req_headers: headerDump,
  };

  const { data, error } = await supabase
    .from("rakuten_bank_mail_events")
    .insert(insertRow)
    .select("id, received_at")
    .single();

  if (error) {
    console.error("[rakuten-bank-mail] db insert failed", { requestId, error });
    return json({ ok: false, requestId, error: "DB insert failed", detail: error.message }, 500);
  }

  const elapsedMs = Date.now() - started;
  console.log("[rakuten-bank-mail] done", {
    requestId,
    insertedId: data?.id ?? null,
    receivedAt: data?.received_at ?? null,
    elapsedMs,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      requestId,
      insertedId: data?.id ?? null,
      receivedAt: data?.received_at ?? null,
      elapsedMs,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
});