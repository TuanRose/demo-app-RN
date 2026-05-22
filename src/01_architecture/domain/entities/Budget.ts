export type BudgetPeriod = 'monthly' | 'weekly';

export interface Budget {
  id: string;
  categoryId: string;
  limit: number;
  period: BudgetPeriod;
  // spent is computed at query time — not stored — to avoid sync issues
  spent?: number;
  startDate: string; // ISO 8601
}
