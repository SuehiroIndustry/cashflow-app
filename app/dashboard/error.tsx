// app/dashboard/error.tsx
'use client';

import { useEffect } from 'react';

export default function Error({
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
      <h2>Dashboard Error</h2>
      <p>原因は下に出してあります。これで「真っ黒」から卒業。</p>

      <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>

      <button
        onClick={reset}
        style={{ marginTop: 12, padding: '6px 12px', cursor: 'pointer' }}
      >
        Retry
      </button>
    </div>
  );
}