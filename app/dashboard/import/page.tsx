// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import React from "react";
import ImportClient from "./ImportClient";

// ✅ 口座は楽天銀行1つ前提：最初の口座を使う
import { getAccounts } from "../_actions/getAccounts";
import type { AccountRow } from "../_types";

function pickFirstCashAccountId(accounts: AccountRow[]): number | null {
  if (!accounts?.length) return null;

  const a: any = accounts[0];

  // プロジェクト内で型が揺れてても拾えるようにする
  const id =
    (typeof a.id === "number" && Number.isFinite(a.id) && a.id) ||
    (typeof a.cash_account_id === "number" &&
      Number.isFinite(a.cash_account_id) &&
      a.cash_account_id) ||
    null;

  return id;
}

export default async function Page() {
  const accounts = (await getAccounts()) as AccountRow[];

  const cashAccountId = pickFirstCashAccountId(accounts);

  if (!cashAccountId) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
        口座が見つかりませんでした。先に口座データを作成してください。
      </div>
    );
  }

  // ✅ ImportClient が要求する cashAccountId を必ず渡す
  return <ImportClient cashAccountId={cashAccountId} />;
}