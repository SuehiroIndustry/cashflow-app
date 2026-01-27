// app/dashboard/page.tsx（該当部分だけ置き換え）

const accountParamRaw = sp.account ? Number(sp.account) : NaN;

// ✅ 0 は “全口座”
const selectedAccountId =
  Number.isFinite(accountParamRaw)
    ? accountParamRaw // 0も含む
    : accounts.length > 0
    ? accounts[0].id
    : null;

// ✅ monthly：全口座(0) のときは getMonthlyBalance に 0 を渡す（対応済み前提）
const monthly =
  selectedAccountId != null
    ? ((await getMonthlyBalance({ cashAccountId: selectedAccountId, months: 24 })) as MonthlyBalanceRow[])
    : [];

// ✅ selectedAccountName：全口座(0) のときは null でもいいが、表示用に名前を入れるのが親切
const selectedAccount =
  selectedAccountId != null && selectedAccountId !== 0
    ? accounts.find((a) => a.id === selectedAccountId) ?? null
    : null;

const cashStatus: CashStatus = {
  selectedAccountId,
  selectedAccountName:
    selectedAccountId === 0 ? "全口座" : selectedAccount?.name ?? null,
  currentBalance:
    selectedAccountId === 0
      ? null // 全口座の残高を出したいなら別集計が必要（今はnullでOK）
      : selectedAccount
      ? Number(selectedAccount.current_balance)
      : null,
  // ...以下そのまま
};