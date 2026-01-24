import DashboardClient from './DashboardClient'
import { getDashboardCashStatus } from './_actions/getDashboardCashStatus'
import { getDashboardCashAlertCards } from './_actions/getDashboardCashAlertCards'

// ここは好みでOK
const THRESHOLD = 1_000_000

export default async function DashboardPage() {
  const cashStatus = await getDashboardCashStatus(THRESHOLD)
  const alertCards =
    cashStatus.status === 'ok' ? [] : await getDashboardCashAlertCards(THRESHOLD)

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={alertCards}>
      {/* 既存のDashboard本体（Overview/Charts/表/フィルタなど）をここへ */}
      {/* いったんは何も入れず、警告ブロックだけ表示確認でもOK */}
    </DashboardClient>
  )
}