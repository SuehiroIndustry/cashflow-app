export async function getMonthlyBalance(accountId: string) {
  const supabase = createServerComponentClient({ cookies });

  const { data } = await supabase
    .from('monthly_account_balances')
    .select('month, income, expense, balance')
    .eq('account_id', accountId)
    .order('month', { ascending: false })
    .limit(12);

  return data;
}