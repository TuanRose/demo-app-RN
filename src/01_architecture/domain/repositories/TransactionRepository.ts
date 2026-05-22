import { Transaction } from '../entities/Transaction';

export interface TransactionFilter {
  budgetId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  type?: Transaction['type'];
}

// Interface only — Domain has zero knowledge of SQLite or any storage detail
export interface TransactionRepository {
  getAll(filter?: TransactionFilter): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;
  update(id: string, changes: Partial<Transaction>): Promise<Transaction>;
  delete(id: string): Promise<void>;
}
