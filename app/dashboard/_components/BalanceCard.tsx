type Props = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};

export function BalanceCard({ month, income, expense, balance }: Props) {
  return (
    <div>
      <div>{month}</div>
      <div>収入: {income.toLocaleString()}</div>
      <div>支出: {expense.toLocaleString()}</div>
      <div>残高: {balance.toLocaleString()}</div>
    </div>
  );
}