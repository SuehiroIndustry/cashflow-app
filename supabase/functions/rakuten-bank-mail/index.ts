Deno.serve(async (req) => {
  let payload: unknown = null;

  // JSONボディが無い/壊れてても落とさない
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      payload = await req.text(); // 何か来てるなら一応読む
    }
  } catch {
    payload = null;
  }

  return new Response(
    JSON.stringify({ ok: true, received: payload }),
    { headers: { "Content-Type": "application/json" } }
  );
});