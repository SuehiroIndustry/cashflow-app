// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Tx = {
  id: string;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  amount: number;
  category: string | null;
  memo: string | null;
};

type PageProps = {
  searchParams?: {
    success?: string;
    error?: string;
  };
};

function formatJPY(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function toYMD(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s; // HTML date input -> "YYYY-MM-DD"
}

function toTrimmed(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function q(s: string) {
  return encodeURIComponent(s);
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const success = searchParams?.success ? decodeURIComponent(searchParams.success) : "";
  const errorMsg = searchParams?.error ? decodeURIComponent(searchParams.error) : "";

  // --- Server Actions ---
  async function addTransaction(formData: FormData) {
    "use server";

    try {
      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) redirect("/login");

      const date = toYMD(formData.get("date"));
      const type = toTrimmed(formData.get("type")) as "income" | "expense";
      const amountRaw = toTrimmed(formData.get("amount"));
      const category = toTrimmed(formData.get("category")) || null;
      const memo = toTrimmed(formData.get("memo")) || null;

      const amount = Number(amountRaw);

      if (!date) throw new Error("date is required");
      if (type !== "income" && type !== "expense") throw new Error("invalid type");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be > 0");

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        date,
        type,
        amount,
        category,
        memo,
      });

      if (error) throw new Error(error.message);

      revalidatePath("/dashboard");
      redirect(`/dashboard?success=${q("✅ Added")}`);
    } catch (e: any) {
      redirect(`/dashboard?error=${q(`❌ ${e?.message ?? "Unknown error"}`)}`);
    }
  }

  async function updateTransaction(formData: FormData) {
    "use server";

    try {
      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) redirect("/login");

      const id = toTrimmed(formData.get("id"));
      const date = toYMD(formData.get("date"));
      const type = toTrimmed(formData.get("type")) as "income" | "expense";
      const amountRaw = toTrimmed(formData.get("amount"));
      const category = toTrimmed(formData.get("category")) || null;
      const memo = toTrimmed(formData.get("memo")) || null;

      const amount = Number(amountRaw);

      if (!id) throw new Error("id is required");
      if (!date) throw new Error("date is required");
      if (type !== "income" && type !== "expense") throw new Error("invalid type");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be > 0");

      const { error } = await supabase
        .from("transactions")
        .update({
          date,
          type,
          amount,
          category,
          memo,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw new Error(error.message);

      revalidatePath("/dashboard");
      redirect(`/dashboard?success=${q("✅ Updated")}`);
    } catch (e: any) {
      redirect(`/dashboard?error=${q(`❌ ${e?.message ?? "Unknown error"}`)}`);
    }
  }

  async function deleteTransaction(formData: FormData) {
    "use server";

    try {
      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) redirect("/login");

      const id = toTrimmed(formData.get("id"));
      if (!id) throw new Error("id is required");

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw new Error(error.message);

      revalidatePath("/dashboard");
      redirect(`/dashboard?success=${q("✅ Deleted")}`);
    } catch (e: any) {
      redirect(`/dashboard?error=${q(`❌ ${e?.message ?? "Unknown error"}`)}`);
    }
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  // --- Data fetch (SSR) ---
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("id,date,type,amount,category,memo")
    .order("date", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Dashboard</h1>
        <p>Logged in: {user.email}</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
      </main>
    );
  }

  const txs = (rows ?? []) as Tx[];

  const income = txs.filter((t) => t.type === "income").reduce((a, b) => a + (b.amount ?? 0), 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((a, b) => a + (b.amount ?? 0), 0);
  const balance = income - expense;

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dashboard</h1>
      <div style={{ marginBottom: 12, opacity: 0.9 }}>Logged in: {user.email}</div>

      {/* Feedback banner */}
      {(success || errorMsg) && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.04)",
            whiteSpace: "pre-wrap",
          }}
        >
          {success ? success : errorMsg}
        </div>
      )}

      <form action={signOut} style={{ marginBottom: 20 }}>
        <button type="submit" style={{ padding: "8px 12px", borderRadius: 8 }}>
          Sign out
        </button>
      </form>

      {/* Summary cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 14 }}>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Balance</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatJPY(balance)}</div>
        </div>
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 14 }}>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Income</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatJPY(income)}</div>
        </div>
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 14 }}>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Expense</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatJPY(expense)}</div>
        </div>
      </section>

      {/* Add */}
      <section style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Add Transaction</h2>

        <form action={addTransaction} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>date</div>
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              style={{ width: "100%", padding: 10, borderRadius: 10 }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>type</div>
            <select name="type" defaultValue="expense" style={{ width: "100%", padding: 10, borderRadius: 10 }}>
              <option value="income">income</option>
              <option value="expense">expense</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>amount</div>
            <input name="amount" type="number" min="1" step="1" placeholder="1000" style={{ width: "100%", padding: 10, borderRadius: 10 }} />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>category</div>
            <input name="category" placeholder="food / sales / ..." style={{ width: "100%", padding: 10, borderRadius: 10 }} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>memo</div>
            <input name="memo" placeholder="optional" style={{ width: "100%", padding: 10, borderRadius: 10 }} />
          </div>

          <button type="submit" style={{ width: 120, padding: "10px 12px", borderRadius: 10 }}>
            Add
          </button>
        </form>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          ※ まずは insert→select→update→delete が通ることを確認。見た目は後でいじる。
        </div>
      </section>

      {/* List */}
      <section style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Transactions</h2>

        {txs.length === 0 ? (
          <div style={{ opacity: 0.8 }}>まだデータがありません（空でOK）。</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.75 }}>
                  <th style={{ padding: "10px 8px" }}>date</th>
                  <th style={{ padding: "10px 8px" }}>type</th>
                  <th style={{ padding: "10px 8px" }}>amount</th>
                  <th style={{ padding: "10px 8px" }}>category</th>
                  <th style={{ padding: "10px 8px" }}>memo</th>
                  <th style={{ padding: "10px 8px" }}>id</th>
                  <th style={{ padding: "10px 8px" }}>action</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                    <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{t.date}</td>
                    <td style={{ padding: "10px 8px" }}>{t.type}</td>
                    <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{formatJPY(t.amount)}</td>
                    <td style={{ padding: "10px 8px" }}>{t.category ?? ""}</td>
                    <td style={{ padding: "10px 8px" }}>{t.memo ?? ""}</td>
                    <td style={{ padding: "10px 8px", fontSize: 12, opacity: 0.8 }}>{t.id}</td>

                    <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                      {/* Edit */}
                      <details style={{ display: "inline-block", marginRight: 10 }}>
                        <summary style={{ cursor: "pointer" }}>Edit</summary>
                        <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, minWidth: 320 }}>
                          <form action={updateTransaction} style={{ display: "grid", gap: 8 }}>
                            <input type="hidden" name="id" value={t.id} />

                            <label style={{ display: "grid", gap: 4 }}>
                              <span style={{ fontSize: 12, opacity: 0.75 }}>date</span>
                              <input name="date" type="date" defaultValue={t.date} style={{ padding: 8, borderRadius: 8 }} />
                            </label>

                            <label style={{ display: "grid", gap: 4 }}>
                              <span style={{ fontSize: 12, opacity: 0.75 }}>type</span>
                              <select name="type" defaultValue={t.type} style={{ padding: 8, borderRadius: 8 }}>
                                <option value="income">income</option>
                                <option value="expense">expense</option>
                              </select>
                            </label>

                            <label style={{ display: "grid", gap: 4 }}>
                              <span style={{ fontSize: 12, opacity: 0.75 }}>amount</span>
                              <input name="amount" type="number" min="1" step="1" defaultValue={t.amount} style={{ padding: 8, borderRadius: 8 }} />
                            </label>

                            <label style={{ display: "grid", gap: 4 }}>
                              <span style={{ fontSize: 12, opacity: 0.75 }}>category</span>
                              <input name="category" defaultValue={t.category ?? ""} style={{ padding: 8, borderRadius: 8 }} />
                            </label>

                            <label style={{ display: "grid", gap: 4 }}>
                              <span style={{ fontSize: 12, opacity: 0.75 }}>memo</span>
                              <input name="memo" defaultValue={t.memo ?? ""} style={{ padding: 8, borderRadius: 8 }} />
                            </label>

                            <button type="submit" style={{ padding: "8px 10px", borderRadius: 8 }}>
                              Save
                            </button>
                          </form>
                        </div>
                      </details>

                      {/* Delete */}
                      <form action={deleteTransaction} style={{ display: "inline-block" }}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" style={{ padding: "8px 10px", borderRadius: 8 }}>
                          Delete
                        </button>
                      </form>
                    </td>
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