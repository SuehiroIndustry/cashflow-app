// app/dashboard/import/_lib/parseZenginCsv.ts
export type ZenginParsedRow = {
  date: string; // YYYY-MM-DD
  section: "income" | "expense";
  amount: number;
  summary: string;
  raw: string[];
};

function strip(s: unknown): string {
  return (typeof s === "string" ? s : "").trim();
}

function toInt(s: string): number {
  const n = Number(s.replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Zengin / Rakuten exported date often comes as YYMMDD where YY is Reiwa year.
 * e.g. 071104 => Reiwa 7-11-04 => 2025-11-04
 *
 * Heuristic:
 * - if 6 digits and yy>=1 and (2018+yy) is plausible (2019..2099), treat as Reiwa.
 * - else treat as 2000+yy (classic YY)
 */
export function parseZenginDateYYMMDD(v: string): string | null {
  const s = strip(v);
  if (!/^\d{6}$/.test(s)) return null;

  const yy = Number(s.slice(0, 2));
  const mm = Number(s.slice(2, 4));
  const dd = Number(s.slice(4, 6));

  if (!yy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const reiwaYear = 2018 + yy; // Reiwa 1 => 2019
  const isPlausibleReiwa = reiwaYear >= 2019 && reiwaYear <= 2099;

  const year = isPlausibleReiwa ? reiwaYear : 2000 + yy;

  const iso = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return iso;
}

/**
 * Parse Zengin CSV (record type "1" header + many type "2" detail).
 * We expect CSV already decoded into string (Shift_JIS decoded in client).
 */
export function parseZenginCsvText(csvText: string): {
  rows: ZenginParsedRow[];
  debug: {
    delimiter: "," | "\t" | ";";
    headerIndex: number;
    firstLines: string[];
  };
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  // delimiter: try comma first (Zengin is usually comma), fallback
  const delimiter: "," | "\t" | ";" =
    lines.some((l) => l.includes(",")) ? "," : lines.some((l) => l.includes("\t")) ? "\t" : ";";

  // basic CSV split (quoted) — good enough for this file pattern
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
        continue;
      }

      if (!inQ && ch === delimiter) {
        out.push(cur);
        cur = "";
        continue;
      }

      cur += ch;
    }
    out.push(cur);
    return out.map((x) => x.trim());
  };

  const parsed = lines.map(parseLine);

  // find header record type "1" (first cell === "1")
  const headerIndex = parsed.findIndex((r) => strip(r[0]) === "1");

  // detail records type "2"
  const detail = parsed.filter((r) => strip(r[0]) === "2");

  const rows: ZenginParsedRow[] = detail
    .map((r) => {
      // Observed sample:
      // [0]=2
      // [2]=取引日(YYMMDD) / [3]=起算日(YYMMDD)
      // [4]=入出金区分(1=入金,2=出金?)  ※ファイルによって揺れるので後で判定
      // [6]=金額(ゼロ埋め)
      // [14]=依頼人名/摘要っぽい
      const dateRaw = strip(r[2]) || strip(r[3]);
      const date = parseZenginDateYYMMDD(dateRaw) ?? "0000-00-00";

      const kubun = strip(r[4]); // sample: "1" or "2"
      // 楽天/全銀系は "1=入金" "2=出金" が多い
      const section: "income" | "expense" = kubun === "1" ? "income" : "expense";

      const amount = toInt(strip(r[6]));
      const summary = strip(r[14]) || strip(r[15]) || "";

      return { date, section, amount, summary, raw: r };
    })
    // ignore completely broken rows
    .filter((x) => x.amount !== 0 || x.summary !== "" || x.date !== "0000-00-00");

  return {
    rows,
    debug: {
      delimiter,
      headerIndex,
      firstLines: lines.slice(0, 5),
    },
  };
}