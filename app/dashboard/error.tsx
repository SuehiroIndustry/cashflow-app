// app/dashboard/error.tsx
'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error boundary:', error);
  }, [error]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Dashboard crashed</h2>
      <p>原因は下に出しています。ここで「真っ黒」から卒業。</p>

      <pre
        style={{
          whiteSpace: 'pre-wrap',
          background: '#111',
          color: '#f55',
          padding: 12,
          borderRadius: 6,
        }}
      >
        {error?.message}
      </pre>

      <button
        onClick={reset}
        style={{
          marginTop: 12,
          padding: '6px 12px',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  );
}