import { Category } from '../entities/Category';

export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(category: Omit<Category, 'id'>): Promise<Category>;
  delete(id: string): Promise<void>;
}
