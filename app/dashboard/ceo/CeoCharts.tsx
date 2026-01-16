"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Row = {
  month: string; // YYYY-MM-01
  in_sum: number;
  out_sum: number;
  net: number;
};

export default function CeoCharts({ rows }: { rows: Row[] }) {
  const data = rows.map((r) => ({
    ...r,
    // 表示を短くしたいならここで整形（例：2024-01）
    label: r.month.slice(0, 7),
  }));

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="in_sum" dot={false} />
          <Line type="monotone" dataKey="out_sum" dot={false} />
          <Line type="monotone" dataKey="net" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}