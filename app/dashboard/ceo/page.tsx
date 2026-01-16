import React from "react";
import { redirect } from "next/navigation";
import CeoCharts from "./CeoCharts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MonthlyRow = {
  month: string;
  in_sum: number;
  out_sum: number;
  net: number;
};

export default async function CeoDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  // 今月サマリ（View名はあなたの実装に合わせて）
  const curRes = await supabase
    .from("v_cash_monthly_summary_current")
    .select("month,in_sum,out_sum,net")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  // 24ヶ月（折れ線用）
  const seriesRes = await supabase
    .from("v_cash_monthly_summary_24m")
    .select("month,in_sum,out_sum,net")
    .eq("user_id", user.id)
    .order("month", { ascending: true });

  // カテゴリ別トップ（今月）
  const topRes = await supabase
    .from("v_cash_monthly_out_by_category_current")
    .select("category,out_sum")
    .eq("user_id", user.id)
    .order("out_sum", { ascending: false })
    .limit(10);

  if (curRes.error || seriesRes.error || topRes.error) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>経営者ダッシュボード</h1>
        <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
{JSON.stringify({ curRes: curRes.error, seriesRes: seriesRes.error, topRes: topRes.error }, null, 2)}
        </pre>
      </div>
    );
  }

  const cur = curRes.data;
  const rows = (seriesRes.data ?? []) as MonthlyRow[];
  const top = topRes.data ?? [];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>経営者ダッシュボード</h1>

      <div style={{ display: "grid", gap: 12, marginTop: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
          <div style={{ opacity: 0.8 }}>今月の入金</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{cur?.in_sum ?? 0}</div>
        </div>
        <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
          <div style={{ opacity: 0.8 }}>今月の出金</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{cur?.out_sum ?? 0}</div>
        </div>
        <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
          <div style={{ opacity: 0.8 }}>今月の差額（NET）</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{cur?.net ?? 0}</div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>24ヶ月推移</div>
        <CeoCharts rows={rows} />
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>今月の支出トップ（カテゴリ）</div>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          {top.map((r: any) => (
            <li key={r.category}>
              {r.category}：{r.out_sum}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}