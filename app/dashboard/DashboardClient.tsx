const [accounts, setAccounts] = useState<AccountRow[]>([]);
const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
const [monthly, setMonthly] = useState<any[]>([]);

// accounts 取得
useEffect(() => {
  getAccounts().then((data) => {
    if (!data || data.length === 0) return;
    setAccounts(data);
    setSelectedAccountId(data[0].id); // default
  });
}, []);

// accountId が確定してから月次取得
useEffect(() => {
  if (!selectedAccountId) return;

  getMonthlyBalance(selectedAccountId).then((data) => {
    setMonthly(data ?? []);
  });
}, [selectedAccountId]);