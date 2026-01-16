'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type CashAccount = {
  id: number;
  name: string;
};

export default function DashboardClient({
  initialAccounts,
}: {
  initialAccounts: CashAccount[];
}) {
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/overview');
      const json = await res.json();
      setOverview(json);
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Cashflow Dashboard</h1>

      <h2>Accounts</h2>
      <ul>
        {initialAccounts.map((a) => (
          <li key={a.id}>
            #{a.id} {a.name}
          </li>
        ))}
      </ul>

      {overview && (
        <>
          <h2>Overview</h2>
          <p>Balance: {overview.current_balance}</p>
          <p>Month: +{overview.month_income} / -{overview.month_expense}</p>
          <p>Planned: +{overview.planned_income} / -{overview.planned_expense}</p>
          <p>Projected: {overview.projected_balance}</p>
          <p>Risk: {overview.risk_level}</p>
        </>
      )}
    </div>
  );
}