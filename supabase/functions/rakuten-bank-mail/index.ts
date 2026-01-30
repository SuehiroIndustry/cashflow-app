// supabase/functions/rakuten-bank-mail/index.ts

type Payload = {
  from?: string;
  subject?: string;
  date?: string;
  body?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function mask(v: string, visible = 4) {
  if (!v) return "";
  if (v.length <= visible * 2) return "*".repeat(v.length);
  return v.slice(0, visible) + "****" + v.slice(-visible);
}

function getHeader(req: Request, name: string) {
  // Supabase/Cloudflare経由で大文字小文字が揺れることがあるので吸収
  const direct = req.headers.get(name);
  if (direct) return direct;
  const lower = req.headers.get(name.toLowerCase());
  if (lower) return lower;

  // 全探索（最後の保険）
  const target = name.toLowerCase();
  for (const [k, v] of req.headers.entries()) {
    if (k.toLowerCase() === target) return v;
  }
  return null;
}

Deno.serve(async (req) => {
  const started = Date.now();

  // Supabaseが付けるrequest id（ログ突合に超便利）
  const requestId =
    req.headers.get("x-sb-request-id") ??
    req.headers.get("x-request-id") ??
    crypto.randomUUID();

  const url = new URL(req.url);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "content-type, authorization, apikey, x-webhook-secret",
      },
    });
  }

  if (req.method !== "POST") {
    console.log(`[rakuten-bank-mail] (${requestId}) method not allowed`, req.method);
    return json({ ok: false, error: "Method Not Allowed", requestId }, 405);
  }

  // ---- ここから「絶対にログに残す」セクション ----
  const authorization = getHeader(req, "Authorization");
  const apikey = getHeader(req, "apikey");
  const xWebhookSecret = getHeader(req, "X-Webhook-Secret");

  console.log(`[rakuten-bank-mail] (${requestId}) called`, {
    method: req.method,
    path: url.pathname,
    contentType: getHeader(req, "Content-Type"),
    authSet: Boolean(authorization),
    apikeySet: Boolean(apikey),
    xWebhookSecretSet: Boolean(xWebhookSecret),
    ua: getHeader(req, "User-Agent"),
  });

  // Secretチェック（必要ならON）
  const expectedSecret = Deno.env.get("RAKUTEN_WEBHOOK_SECRET") ?? "";
  if (!expectedSecret) {
    console.error(
      `[rakuten-bank-mail] (${requestId}) missing env RAKUTEN_WEBHOOK_SECRET`,
    );
    return json(
      { ok: false, error: "Server misconfigured: missing secret", requestId },
      500,
    );
  }

  if ((xWebhookSecret ?? "") !== expectedSecret) {
    console.warn(`[rakuten-bank-mail] (${requestId}) unauthorized: secret mismatch`, {
      provided: xWebhookSecret ? mask(xWebhookSecret) : null,
      expected: mask(expectedSecret),
    });
    return json({ ok: false, error: "Unauthorized", requestId }, 401);
  }

  // Body受信
  const raw = await req.text();
  console.log(`[rakuten-bank-mail] (${requestId}) body received`, {
    bytes: raw.length,
  });

  let payload: Payload | null = null;
  try {
    payload = raw ? (JSON.parse(raw) as Payload) : null;
  } catch (e) {
    console.error(`[rakuten-bank-mail] (${requestId}) invalid json`, String(e));
    return json({ ok: false, error: "Invalid JSON", requestId }, 400);
  }

  // 中身を安全にログ（本文は長いので先頭だけ）
  console.log(`[rakuten-bank-mail] (${requestId}) payload summary`, {
    from: payload?.from ?? null,
    subject: payload?.subject ?? null,
    date: payload?.date ?? null,
    bodyPreview: payload?.body ? payload.body.slice(0, 120) : null,
  });

  const elapsed = Date.now() - started;

  // 返す（Apps Script側のログにもここが出る）
  return new Response(
    JSON.stringify({
      ok: true,
      requestId,
      elapsedMs: elapsed,
      received: {
        from: payload?.from ?? null,
        subject: payload?.subject ?? null,
        date: payload?.date ?? null,
        bodyBytes: payload?.body?.length ?? 0,
      },
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