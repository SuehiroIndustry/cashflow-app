// app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

type Transaction = {
  id: string;
  user_id: string;
  date: string; // date型は文字列で返る
  type: string;
  amount: number;
  category: string | null;
  memo: string | null;
};

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component から set できないケースがある（Route Handler / Server ActionならOK）
          }
        },
      },
    }
  );

  // 1) ログイン確認（未ログインなら /login へ）
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // 2) transactions を select（RLSで自分の行だけ見える前提）
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("id, user_id, date, type, amount, category, memo")
    .order("date", { ascending: false })
    .limit(50);

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <div style={{ marginBottom: 16 }}>
        Logged in: <b>{session.user.email ?? session.user.id}</b>
      </div>

      <h2>Transactions</h2>

      {error ? (
        <pre style={{ color: "tomato", whiteSpace: "pre-wrap" }}>
          {JSON.stringify(
            { message: error.message, details: error.details, hint: error.hint },
            null,
            2
          )}
        </pre>
      ) : !transactions || transactions.length === 0 ? (
        <p>まだデータがありません（空でOK）。</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              minWidth: 720,
              width: "100%",
            }}
          >
            <thead>
              <tr>
                {["date", "type", "amount", "category", "memo", "id"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid #333",
                        padding: "8px 6px",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {(transactions as Transaction[]).map((t) => (
                <tr key={t.id}>
                  <td style={{ padding: "8px 6px" }}>{t.date}</td>
                  <td style={{ padding: "8px 6px" }}>{t.type}</td>
                  <td style={{ padding: "8px 6px" }}>{t.amount}</td>
                  <td style={{ padding: "8px 6px" }}>{t.category ?? ""}</td>
                  <td style={{ padding: "8px 6px" }}>{t.memo ?? ""}</td>
                  <td style={{ padding: "8px 6px", opacity: 0.7 }}>
                    {t.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />
      <p style={{ opacity: 0.8 }}>
        ※ログアウトは後で追加する（まずは select が通ることを確認する）。
      </p>
    </main>
  );
}