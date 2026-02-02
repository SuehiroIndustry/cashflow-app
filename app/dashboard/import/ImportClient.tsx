// app/dashboard/import/ImportClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  cashAccountId: number | null;
};

export default function ImportClient({ cashAccountId }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);

  const disabledReason = useMemo(() => {
    if (!cashAccountId) return "cashAccountId が指定されていません（口座選択から来てる？）";
    if (!file) return "CSVファイルを選択してください";
    return null;
  }, [cashAccountId, file]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm">
      <div className="text-sm text-zinc-200">
        口座ID: <span className="font-mono">{cashAccountId ?? "null"}</span>
      </div>

      <div className="mt-4">
        <label className="block text-sm text-zinc-200">CSVファイル</label>
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-2 block w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-zinc-700"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="mt-2 text-xs text-zinc-400">
          ※ まずは画面復旧（404解消）が目的。次に「アップロード→DB反映」を繋ぐ。
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          onClick={() => router.push("/dashboard")}
        >
          ダッシュボードへ戻る
        </button>

        <button
          type="button"
          disabled={!!disabledReason}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700"
          onClick={() => {
            // ここに後で「アップロード→取り込み」処理を繋ぐ
            alert("次はここにインポート処理を繋ぐ。まず404は潰れたはず。");
          }}
        >
          インポート実行（仮）
        </button>

        {disabledReason && (
          <div className="self-center text-xs text-amber-300">{disabledReason}</div>
        )}
      </div>
    </div>
  );
}