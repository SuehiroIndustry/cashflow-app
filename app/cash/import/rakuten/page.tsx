// app/cash/import/rakuten/page.tsx
import { uploadRakutenCsv } from "./_actions/uploadRakutenCsv";

export default function RakutenCsvImportPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>楽天銀行 明細CSVアップロード</h1>

      <form action={uploadRakutenCsv}>
        <div style={{ marginTop: 16 }}>
          <input
            type="file"
            name="file"
            accept=".csv"
            required
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit">
            アップロード
          </button>
        </div>
      </form>
    </div>
  );
}