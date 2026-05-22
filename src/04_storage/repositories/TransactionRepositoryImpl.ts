import type { Scalar } from '@op-engineering/op-sqlite';
import { getDb } from '../database/db';

export type Transaction = {
  id: string;
  label: string;
  amount: number;
  categoryId: string;
  date: string;
  syncStatus: 'synced' | 'pending';
};

type TransactionFilter = 'all' | 'income' | 'expense';

// Mirrors ITransactionRepository from 01_architecture/domain — kept local for lesson isolation
export interface ITransactionRepository {
  getAll(filter?: TransactionFilter): Transaction[];
  getById(id: string): Transaction | null;
  create(data: Omit<Transaction, 'id' | 'syncStatus'>): Transaction;
  delete(id: string): void;
  markSynced(id: string): void;
  getPending(): Transaction[];
}

function rowToTransaction(row: Record<string, Scalar>): Transaction {
  return {
    id: row.id as string,
    label: row.label as string,
    amount: row.amount as number,
    categoryId: row.category_id as string,
    date: row.date as string,
    syncStatus: row.sync_status as 'synced' | 'pending',
  };
}

export class TransactionRepositoryImpl implements ITransactionRepository {
  private get db() {
    return getDb();
  }

  getAll(filter: TransactionFilter = 'all'): Transaction[] {
    let query = 'SELECT * FROM transactions';

    if (filter === 'income') {
      query += ' WHERE amount > 0';
    } else if (filter === 'expense') {
      query += ' WHERE amount < 0';
    }

    query += ' ORDER BY date DESC, created_at DESC';

    // executeSync — op-sqlite v15 synchronous API, không block UI thread
    // vì SQLite chạy trên JSI (không qua bridge)
    const { rows } = this.db.executeSync(query);
    return rows.map(rowToTransaction);
  }

  getById(id: string): Transaction | null {
    const { rows } = this.db.executeSync(
      'SELECT * FROM transactions WHERE id = ?',
      [id],
    );
    return rows[0] ? rowToTransaction(rows[0]) : null;
  }

  create(data: Omit<Transaction, 'id' | 'syncStatus'>): Transaction {
    const id = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const params: Scalar[] = [
      id,
      data.label,
      data.amount,
      data.categoryId,
      data.date,
      'pending',
    ];
    this.db.executeSync(
      'INSERT INTO transactions (id, label, amount, category_id, date, sync_status) VALUES (?, ?, ?, ?, ?, ?)',
      params,
    );
    return { ...data, id, syncStatus: 'pending' };
  }

  delete(id: string): void {
    this.db.executeSync('DELETE FROM transactions WHERE id = ?', [id]);
  }

  markSynced(id: string): void {
    this.db.executeSync(
      "UPDATE transactions SET sync_status = 'synced' WHERE id = ?",
      [id],
    );
  }

  getPending(): Transaction[] {
    const { rows } = this.db.executeSync(
      "SELECT * FROM transactions WHERE sync_status = 'pending' ORDER BY created_at ASC",
    );
    return rows.map(rowToTransaction);
  }
}

export const transactionRepo = new TransactionRepositoryImpl();
