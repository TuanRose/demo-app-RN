import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueue } from '../sync/syncQueue';
import { transactionRepo, type Transaction } from '../repositories/TransactionRepositoryImpl';

type TransactionFilter = 'all' | 'income' | 'expense';

// queryFn đọc từ SQLite thay vì mock API
// TanStack Query vẫn xử lý caching, loading state, và background refetch
export function useTransactions(filter: TransactionFilter = 'all') {
  return useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => transactionRepo.getAll(filter),
    // SQLite read là synchronous và local — staleTime cao hơn vì data chỉ
    // thay đổi khi user thực hiện action (không có background server push)
    staleTime: Infinity,
  });
}

export function useAddTransaction(isOnline: boolean) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Transaction, 'id' | 'syncStatus'>) => {
      // Ghi vào SQLite ngay lập tức — không đợi network
      const transaction = transactionRepo.create(data);

      if (isOnline) {
        // Online: enqueue để sync lên server (fire and forget trong demo)
        enqueue('CREATE_TRANSACTION', transaction);
      } else {
        // Offline: lưu vào queue, sẽ flush khi network trở lại
        enqueue('CREATE_TRANSACTION', transaction);
      }

      return Promise.resolve(transaction);
    },

    onSuccess: () => {
      // Invalidate tất cả filter variants để re-read từ SQLite
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      transactionRepo.delete(id);
      enqueue('DELETE_TRANSACTION', { id });
      return Promise.resolve(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
