import { Budget } from '../entities/Budget';

export interface BudgetRepository {
  getAll(): Promise<Budget[]>;
  getById(id: string): Promise<Budget | null>;
  create(budget: Omit<Budget, 'id'>): Promise<Budget>;
  update(id: string, changes: Partial<Budget>): Promise<Budget>;
  delete(id: string): Promise<void>;
}
