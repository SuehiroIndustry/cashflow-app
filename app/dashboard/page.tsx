// app/dashboard/page.tsx
import DashboardClient from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import type { AlertCard, CashStatus } from "./_types";

export default async function DashboardPage() {
  // 1) 基本データ取得
  const accounts = await getAccounts();

  // 選択口座（今は “先頭をデフォルト” にしておく。必要なら後でユーザー設定にする）
  const selectedAccountId = accounts?.[0]?.id ?? null;

  // 2) 月次残高（選択口座がある時だけ）
  const monthly = selectedAccountId ? await getMonthlyBalance(selectedAccountId) : [];

  // 3) 画面上部のステータス（最低限の現実解）
  //    ※ここは後で「危険信号のみ表示」ポリシーに合わせて洗練していけばOK
  const latestBalance = monthly?.length ? (monthly[monthly.length - 1]?.balance ?? 0) : 0;

  const cashStatus: CashStatus =
    latestBalance <= 0
      ? {
          level: "danger",
          title: "残高が危険水域です",
          message:
            "現在残高が 0 円です。支払い予定があるなら、資金ショートが現実的です。",
        }
      : latestBalance < 100000
      ? {
          level: "warn",
          title: "残高が少なめです",
          message:
            "直近の残高が少なめです。今週の支払い予定と入金予定を確認してください。",
        }
      : {
          level: "ok",
          title: "残高は安定しています",
          message: "直近の残高は安定しています。引き続き週次で更新しましょう。",
        };

  // 4) アラートカード（DashboardClient 側で描画）
  //    今は「データ取り込み」枠のリンクだけでもOKなので最低限で入れておく
  const alertCards: AlertCard[] = [
    {
      id: "rakuten-csv",
      title: "データ取り込み",
      items: [
        {
          label: "楽天銀行 明細CSVアップロード",
          href: "/cash/import/rakuten",
          note: "週1でCSVを手動アップロードする運用",
        },
      ],
    },
  ];

  // ✅ ここが肝心：DashboardClient に children を渡す（カード類を“中身”として表示）
  return (
    <DashboardClient
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      monthly={monthly}
      cashStatus={cashStatus}
      alertCards={alertCards}
    >
      {/* ✅ ダッシュボード本体（カード等） */}
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard />
        <BalanceCard />
        <EcoCharts />
      </div>
    </DashboardClient>
  );
}