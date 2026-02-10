export default function ImportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">楽天銀行・明細インポート</h1>

      {/* ↓ 以下2行を削除 */}
      {/* CSVを読み込み → 内容プレビュー → 取り込み */}
      {/* 口座：楽天銀行（ID: 2） */}

      <div className="rounded-lg border p-4">
        {/* ファイルアップロードUI（そのまま） */}
      </div>

      <div className="rounded-lg border p-4">
        {/* プレビュー表示（そのまま） */}
      </div>
    </div>
  );
}