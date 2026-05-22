import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type Transaction = {
  id: string;
  label: string;
  amount: number;
  categoryId: string;
  date: string;
};

// Simulates network latency — swap với real API call khi có backend
async function fetchTransactions(filter: 'all' | 'income' | 'expense'): Promise<Transaction[]> {
  await new Promise<void>(resolve => setTimeout(() => resolve(), 600));

  const all: Transaction[] = [
    { id: 'txn_001', label: 'Café sáng', amount: -35000, categoryId: 'cat_food', date: '2026-05-08' },
    { id: 'txn_002', label: 'Lương tháng 5', amount: 25000000, categoryId: 'cat_income', date: '2026-05-07' },
    { id: 'txn_003', label: 'Tiền nhà', amount: -4500000, categoryId: 'cat_housing', date: '2026-05-05' },
    { id: 'txn_004', label: 'Siêu thị', amount: -320000, categoryId: 'cat_food', date: '2026-05-04' },
    { id: 'txn_005', label: 'Freelance', amount: 3000000, categoryId: 'cat_income', date: '2026-05-02' },
  ];

  if (filter === 'income') return all.filter(t => t.amount > 0);
  if (filter === 'expense') return all.filter(t => t.amount < 0);
  return all;
}

async function addTransactionApi(
  data: Omit<Transaction, 'id' | 'date'>,
): Promise<Transaction> {
  await new Promise<void>(resolve => setTimeout(() => resolve(), 400));
  return { ...data, id: `txn_${Date.now()}`, date: new Date().toISOString().slice(0, 10) };
}

// queryKey phải include filter vì data khác nhau theo filter
export function useTransactions(filter: 'all' | 'income' | 'expense' = 'all') {
  return useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => fetchTransactions(filter),
    staleTime: 1000 * 60 * 5, // 5 phút — transactions không thay đổi thường
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addTransactionApi,
    onSuccess: () => {
      // Invalidate tất cả variants của transactions cache
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
