// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type DashboardSummaryRow = {
  // ↓ここはあなたのRPC戻り値に合わせて増減してOK
  total_income?: number | null;
  total_expense?: number | null;
  balance?: number | null;

  // もし月次や期間なども返してるなら追加
  month?: string | null;
  from_date?: string | null;
  to_date?: string | null;
};

function formatJPY(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("ja-JP").format(n);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // 認証チェック（未ログインなら /login へ）
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    // auth状態が変なときはログインに戻す（握りつぶさず戻す方が安全）
    redirect("/login");
  }
  if (!user) redirect("/login");

  // ---- ここが修正の本体：View select ではなく RPC を叩く ----
  // 例：public.get_dashboard_summary() を作ってある前提
  const { data, error } = await supabase.rpc("get_dashboard_summary");

  if (error) {
    // ここは好みで UI 表示にしてもOK（まずは原因が見えるように throw 推奨）
    throw new Error(`get_dashboard_summary failed: ${error.message}`);
  }

  // returns table の場合、配列で返ることが多い
  const summary = (Array.isArray(data) ? data[0] : data) as
    | DashboardSummaryRow
    | null
    | undefined;

  const income = summary?.total_income ?? 0;
  const expense = summary?.total_expense ?? 0;
  const balance = summary?.balance ?? income - expense;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-white/60 mt-1">
            ようこそ、{user.email ?? "User"}
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-white/60 text-sm">総収入</div>
            <div className="mt-2 text-2xl font-semibold">
              ¥ {formatJPY(income)}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-white/60 text-sm">総支出</div>
            <div className="mt-2 text-2xl font-semibold">
              ¥ {formatJPY(expense)}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-white/60 text-sm">残高</div>
            <div className="mt-2 text-2xl font-semibold">
              ¥ {formatJPY(balance)}
            </div>
          </div>
        </section>

        {/* 必要なら追加情報 */}
        {(summary?.month || summary?.from_date || summary?.to_date) && (
          <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-white/60 text-sm">対象期間</div>
            <div className="mt-2">
              {summary?.month ? (
                <span>{summary.month}</span>
              ) : (
                <span>
                  {summary?.from_date ?? "?"} 〜 {summary?.to_date ?? "?"}
                </span>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}