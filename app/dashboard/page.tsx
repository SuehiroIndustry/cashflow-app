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

  // 選択口座（暫定：先頭）
  const selectedAccountId = accounts?.[0]?.id ?? null;

  // 2) 月次残高（✅ getMonthlyBalance はオブジェクト引数）
  const monthly = selectedAccountId
    ? await getMonthlyBalance({ cashAccountId: selectedAccountId })
    : [];

  // 3) 画面上部のステータス（最低限）
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

  // 4) アラートカード（データ取り込みリンク）
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

  return (
    <DashboardClient
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      monthly={monthly}
      cashStatus={cashStatus}
      alertCards={alertCards}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard />
        <BalanceCard />
        <EcoCharts />
      </div>
    </DashboardClient>
  );
}