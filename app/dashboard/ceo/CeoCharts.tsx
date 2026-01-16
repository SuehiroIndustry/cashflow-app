// app/dashboard/ceo/CeoCharts.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type Row = {
  month: string; // "YYYY-MM-01"
  current_balance: number;
  month_income: number;
  month_expense: number;
  projected_balance_30d: number;
};

export default function CeoCharts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // ✅ ここは君の実装に合わせてエンドポイント名を変えてOK
        const res = await fetch("/api/ceo/monthly", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(typeof json?.error === "string" ? json.error : "Failed to load");
        }

        if (!alive) return;
        setRows(Array.isArray(json) ? (json as Row[]) : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Unknown error");
        setRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const chartData = useMemo(() => {
    return rows.map((r) => ({
      month: r.month.slice(0, 7), // YYYY-MM
      balance: r.current_balance,
      income: r.month_income,
      expense: r.month_expense,
      projected: r.projected_balance_30d,
    }));
  }, [rows]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (err) return <div style={{ padding: 16, color: "#b00" }}>{err}</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ margin: 0 }}>CEO Dashboard</h1>

      {chartData.length === 0 ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #444", borderRadius: 8 }}>
          No data
        </div>
      ) : (
        <div style={{ marginTop: 12, height: 360, border: "1px solid #444", borderRadius: 8, padding: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="balance" />
              <Line type="monotone" dataKey="income" />
              <Line type="monotone" dataKey="expense" />
              <Line type="monotone" dataKey="projected" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}