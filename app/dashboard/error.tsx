"use client";

import * as React from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 8 }}>Dashboard Error</h2>

      <p style={{ color: "tomato" }}>
        {error?.message || "Unknown error"}
      </p>

      {error?.digest ? (
        <p style={{ opacity: 0.8 }}>digest: {error.digest}</p>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <button onClick={() => reset()}>Retry</button>
      </div>
    </div>
  );
}