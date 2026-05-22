export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  budgetId: string | null;
  note: string;
  date: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}
