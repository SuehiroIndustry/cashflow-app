// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import ImportClient from "./ImportClient";

export default function Page() {
  const cashAccountId = 2; // 楽天銀行固定
  return <ImportClient cashAccountId={cashAccountId} />;
}