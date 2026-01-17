export async function getAccounts() {
  const supabase = createServerComponentClient({ cookies });

  const { data } = await supabase
    .from('accounts')
    .select('id, name, type, is_default')
    .order('is_default', { ascending: false })
    .order('created_at');

  return data;
}