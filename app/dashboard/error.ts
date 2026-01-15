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
      <p>原因は下に出してある。これで「真っ黒」から卒業。</p>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      <button onClick={() => reset()} style={{ marginTop: 12 }}>
        Retry
      </button>
    </div>
  );
}