// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import ImportClient from "./ImportClient";

// 楽天銀行の口座IDを固定
const RAKUTEN_BANK_ACCOUNT_ID = 2;

export default async function ImportPage() {
  return (
    <div className="w-full">
      <ImportClient cashAccountId={RAKUTEN_BANK_ACCOUNT_ID} />
    </div>
  );
}