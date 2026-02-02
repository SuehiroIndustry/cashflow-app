// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import ImportClient from "./ImportClient";
import { getAccounts } from "../_actions/getAccounts";

export default async function Page() {
  const accounts = await getAccounts();

  // ✅ 楽天しかない前提：最初の口座を使う（将来増えるならここを判定に変える）
  const cashAccountId = accounts?.[0]?.id ?? null;

  if (!cashAccountId) {
    return (
      <div className="mx-auto w-full max-w-4xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
        口座が見つかりませんでした。先に口座登録を確認してください。
      </div>
    );
  }

  return <ImportClient cashAccountId={cashAccountId} />;
}