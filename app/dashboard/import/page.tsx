// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import ImportClient from "./ImportClient";

export default function Page() {
  // ✅ 楽天銀行を固定
  const cashAccountId = 2;

  return <ImportClient cashAccountId={cashAccountId} />;
}