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

function formatJPY(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function toYMD(v: FormDataEntryValue | null) {
  return String(v ?? "").trim(); // HTML date input -> "YYYY-MM-DD"
}

function toTrimmed(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

/** ---- UI helpers (no CSS file) ---- */
const ui = {
  page: {
    minHeight: "100dvh",
    padding: "28px 18px 56px",
    background:
      "radial-gradient(1200px 600px at 30% -20%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(900px 500px at 80% 10%, rgba(255,255,255,0.06), transparent 55%)",
  } as const,
  wrap: { maxWidth: 1040, margin: "0 auto" } as const,

  h1: { fontSize: 28, fontWeight: 800, letterSpacing: 0.2, margin: "0 0 6px" } as const,
  sub: { opacity: 0.85, marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } as const,

  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } as const,

  card: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
    background: "rgba(0,0,0,0.20)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.30)",
    backdropFilter: "blur(6px)",
  } as const,

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  } as const,

  sectionTitle: { fontSize: 16, fontWeight: 800, margin: "0 0 12px" } as const,

  label: { fontSize: 12, opacity: 0.78, marginBottom: 6 } as const,

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "inherit",
    outline: "none",
  } as const,

  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "inherit",
    outline: "none",
  } as const,

  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "inherit",
    cursor: "pointer",
    fontWeight: 700,
  } as const,

  btnPrimary: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.14)",
    color: "inherit",
    cursor: "pointer",
    fontWeight: 800,
  } as const,

  btnDanger: {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,120,120,0.35)",
    background: "rgba(255,120,120,0.10)",
    color: "inherit",
    cursor: "pointer",
    fontWeight: 800,
  } as const,

  badgeIncome: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(120,255,180,0.35)",
    background: "rgba(120,255,180,0.10)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.2,
  } as const,

  badgeExpense: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,170,120,0.35)",
    background: "rgba(255,170,120,0.10)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.2,
  } as const,

  help: { marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.6 } as const,

  tableWrap: { overflowX: "auto" } as const,
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 } as const,
  th: { padding: "10px 10px", textAlign: "left", opacity: 0.7, fontSize: 12, fontWeight: 800 } as const,
  td: { padding: "12px 10px", verticalAlign: "top" } as const,
  tr: { borderTop: "1px solid rgba(255,255,255,0.10)" } as const,

  mono: { fontSize: 12, opacity: 0.8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" } as const,

  divider: { height: 1, background: "rgba(255,255,255,0.10)", margin: "18px 0" } as const,
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // --- Server Actions ---
  async function addTransaction(formData: FormData) {
    "use server";

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
  }

  async function updateTransaction(formData: FormData) {
    "use server";

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
      .update({ date, type, amount, category, memo })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
    revalidatePath("/dashboard");
  }

  async function deleteTransaction(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const id = toTrimmed(formData.get("id"));
    if (!id) throw new Error("id is required");

    const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
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
      <main style={{ ...ui.page }}>
        <div style={ui.wrap}>
          <h1 style={ui.h1}>Dashboard</h1>
          <div style={ui.sub}>
            <span>Logged in: {user.email}</span>
          </div>
          <div style={ui.card}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Error</div>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0, opacity: 0.9 }}>{error.message}</pre>
          </div>
        </div>
      </main>
    );
  }

  const txs = (rows ?? []) as Tx[];

  const income = txs.filter((t) => t.type === "income").reduce((a, b) => a + (b.amount ?? 0), 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((a, b) => a + (b.amount ?? 0), 0);
  const balance = income - expense;

  return (
    <main style={ui.page}>
      <div style={ui.wrap}>
        {/* Header */}
        <div style={ui.topbar}>
          <div>
            <h1 style={ui.h1}>Dashboard</h1>
            <div style={ui.sub}>
              <span>Logged in:</span>
              <span style={{ fontWeight: 800 }}>{user.email}</span>
            </div>
          </div>

          <form action={signOut}>
            <button type="submit" style={ui.btn}>
              Sign out
            </button>
          </form>
        </div>

        {/* Summary */}
        <section style={{ ...ui.grid3, marginBottom: 18 }}>
          <div style={ui.card}>
            <div style={{ opacity: 0.7, fontSize: 12, fontWeight: 800 }}>Balance</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{formatJPY(balance)}</div>
          </div>
          <div style={ui.card}>
            <div style={{ opacity: 0.7, fontSize: 12, fontWeight: 800 }}>Income</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{formatJPY(income)}</div>
          </div>
          <div style={ui.card}>
            <div style={{ opacity: 0.7, fontSize: 12, fontWeight: 800 }}>Expense</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{formatJPY(expense)}</div>
          </div>
        </section>

        {/* Add */}
        <section style={{ ...ui.card, marginBottom: 18 }}>
          <h2 style={ui.sectionTitle}>Add Transaction</h2>

          <form
            action={addTransaction}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <div style={ui.label}>date</div>
              <input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                style={ui.input}
              />
            </div>

            <div>
              <div style={ui.label}>type</div>
              <select name="type" defaultValue="expense" style={ui.select}>
                <option value="income">income</option>
                <option value="expense">expense</option>
              </select>
            </div>

            <div>
              <div style={ui.label}>amount</div>
              <input
                name="amount"
                type="number"
                min="1"
                step="1"
                placeholder="1000"
                inputMode="numeric"
                style={ui.input}
              />
            </div>

            <div>
              <div style={ui.label}>category</div>
              <input name="category" placeholder="food / sales / ..." style={ui.input} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={ui.label}>memo</div>
              <input name="memo" placeholder="optional" style={ui.input} />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={ui.btnPrimary}>
                Add
              </button>
            </div>
          </form>

          <div style={ui.help}>
            ※ まずは <b>insert → select → update → delete</b> が通ることを確認。見た目はこの段階で整える。
          </div>
        </section>

        {/* List */}
        <section style={ui.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <h2 style={{ ...ui.sectionTitle, marginBottom: 0 }}>Transactions</h2>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Latest: {txs.length} rows (max 200)</div>
          </div>

          <div style={ui.divider} />

          {txs.length === 0 ? (
            <div style={{ opacity: 0.85 }}>まだデータがありません（空でOK）。</div>
          ) : (
            <div style={ui.tableWrap}>
              <table style={ui.table}>
                <thead>
                  <tr style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                    <th style={ui.th}>date</th>
                    <th style={ui.th}>type</th>
                    <th style={{ ...ui.th, textAlign: "right" }}>amount</th>
                    <th style={ui.th}>category</th>
                    <th style={ui.th}>memo</th>
                    <th style={ui.th}>id</th>
                    <th style={ui.th}>action</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id} style={ui.tr}>
                      <td style={{ ...ui.td, whiteSpace: "nowrap" }}>{t.date}</td>

                      <td style={ui.td}>
                        <span style={t.type === "income" ? ui.badgeIncome : ui.badgeExpense}>{t.type}</span>
                      </td>

                      <td style={{ ...ui.td, whiteSpace: "nowrap", textAlign: "right", fontWeight: 900 }}>
                        {formatJPY(t.amount)}
                      </td>

                      <td style={ui.td}>{t.category ?? ""}</td>
                      <td style={ui.td}>{t.memo ?? ""}</td>

                      <td style={{ ...ui.td, ...ui.mono }}>{t.id}</td>

                      <td style={{ ...ui.td, whiteSpace: "nowrap" }}>
                        {/* Edit */}
                        <details style={{ display: "inline-block", marginRight: 10 }}>
                          <summary style={{ cursor: "pointer", userSelect: "none" }}>Edit</summary>
                          <div style={{ marginTop: 10, ...ui.card, padding: 12, minWidth: 340 }}>
                            <form action={updateTransaction} style={{ display: "grid", gap: 10 }}>
                              <input type="hidden" name="id" value={t.id} />

                              <div>
                                <div style={ui.label}>date</div>
                                <input name="date" type="date" defaultValue={t.date} style={ui.input} />
                              </div>

                              <div>
                                <div style={ui.label}>type</div>
                                <select name="type" defaultValue={t.type} style={ui.select}>
                                  <option value="income">income</option>
                                  <option value="expense">expense</option>
                                </select>
                              </div>

                              <div>
                                <div style={ui.label}>amount</div>
                                <input
                                  name="amount"
                                  type="number"
                                  min="1"
                                  step="1"
                                  defaultValue={t.amount}
                                  inputMode="numeric"
                                  style={ui.input}
                                />
                              </div>

                              <div>
                                <div style={ui.label}>category</div>
                                <input name="category" defaultValue={t.category ?? ""} style={ui.input} />
                              </div>

                              <div>
                                <div style={ui.label}>memo</div>
                                <input name="memo" defaultValue={t.memo ?? ""} style={ui.input} />
                              </div>

                              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                <button type="submit" style={ui.btnPrimary}>
                                  Save
                                </button>
                              </div>
                            </form>
                          </div>
                        </details>

                        {/* Delete */}
                        <form action={deleteTransaction} style={{ display: "inline-block" }}>
                          <input type="hidden" name="id" value={t.id} />
                          <button type="submit" style={ui.btnDanger}>
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

        {/* Responsive tweak (small screens): just a hint message */}
        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
          ※ 画面が狭いときは横スクロール。次でレスポンシブ最適化もやれる。
        </div>
      </div>

      {/* Simple responsive adjustment via inline style constraints (no CSS): */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 820px) {
              main { padding: 18px 14px 44px !important; }
              ._grid3 { grid-template-columns: 1fr !important; }
            }
          `,
        }}
      />
    </main>
  );
}