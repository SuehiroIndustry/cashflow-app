// app/dashboard/page.tsx
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type TxType = "income" | "expense";

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return d;
}

function fmtAmount(a: any) {
  if (a === null || a === undefined) return "";
  const n = typeof a === "number" ? a : Number(a);
  if (Number.isNaN(n)) return String(a);
  return n.toLocaleString();
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("id, date, type, amount, category, memo")
    .order("date", { ascending: false })
    .limit(200);

  // ※エラーがあっても画面は出す（原因切り分けしやすい）
  const errMsg = error?.message ?? null;

  const email = user.email ?? "(no email)";

  async function addTransaction(formData: FormData) {
    "use server";

    const { supabase, user } = await requireUser();

    const date = String(formData.get("date") ?? "").trim();
    const typeRaw = String(formData.get("type") ?? "").trim() as TxType;
    const amountRaw = String(formData.get("amount") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const memo = String(formData.get("memo") ?? "").trim();

    const type: TxType = typeRaw === "expense" ? "expense" : "income";

    const amountNum = Number(amountRaw);
    if (!amountRaw || Number.isNaN(amountNum)) {
      // バリデーション：ここで弾く（雑に silent fail させない）
      // Server Action でUIに返す仕組みを入れてないので、最低限 redirect で戻す
      redirect("/dashboard");
    }

    const payload = {
      user_id: user.id,
      date: date || new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      type,
      amount: amountNum,
      category: category || "misc",
      memo: memo || null,
    };

    const { error } = await supabase.from("transactions").insert(payload);
    if (error) {
      // ここで落とすと分かりづらいので、一旦 dashboard に戻す
      // ちゃんと表示したければ後で「エラー表示」対応する
      redirect("/dashboard");
    }

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
      <div style={{ marginBottom: 16 }}>
        <div>Logged in: <strong>{email}</strong></div>
        <form action={signOut} style={{ marginTop: 8 }}>
          <button type="submit">Sign out</button>
        </form>
      </div>

      <section style={{ marginTop: 24, marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>Add Transaction</h2>

        <form action={addTransaction} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>date</span>
            <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>type</span>
            <select name="type" defaultValue="income">
              <option value="income">income</option>
              <option value="expense">expense</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>amount</span>
            <input name="amount" type="number" step="1" placeholder="1000" required />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>category</span>
            <input name="category" type="text" placeholder="test / food / sales ..." />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>memo</span>
            <input name="memo" type="text" placeholder="optional" />
          </label>

          <button type="submit">Add</button>

          <div style={{ opacity: 0.7, fontSize: 12 }}>
            ※まずは insert→select が通ることを確認。見た目は後でいじる。
          </div>
        </form>
      </section>

      <section>
        <h2 style={{ marginBottom: 12 }}>Transactions</h2>

        {errMsg ? (
          <div style={{ marginBottom: 12, color: "tomato" }}>
            Supabase error: {errMsg}
          </div>
        ) : null}

        {!txs || txs.length === 0 ? (
          <div>まだデータがありません（空でOK）。</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr>
                  {["date", "type", "amount", "category", "memo", "id"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid rgba(255,255,255,0.2)",
                        padding: "8px 10px",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.map((t: any) => (
                  <tr key={t.id}>
                    <td style={{ padding: "8px 10px" }}>{fmtDate(t.date)}</td>
                    <td style={{ padding: "8px 10px" }}>{t.type}</td>
                    <td style={{ padding: "8px 10px" }}>{fmtAmount(t.amount)}</td>
                    <td style={{ padding: "8px 10px" }}>{t.category}</td>
                    <td style={{ padding: "8px 10px" }}>{t.memo ?? ""}</td>
                    <td style={{ padding: "8px 10px", opacity: 0.8 }}>{t.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}