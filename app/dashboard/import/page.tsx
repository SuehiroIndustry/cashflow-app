// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import ImportClient from "./ImportClient";

export default async function ImportPage() {
  // ✅ 楽天銀行を固定（id=2）
  const cashAccountId = 2;

  return <ImportClient cashAccountId={cashAccountId} />;
}