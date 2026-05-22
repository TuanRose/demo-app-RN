import { Transaction } from '../entities/Transaction';
import { TransactionRepository } from '../repositories/TransactionRepository';

export class GetTransactionsByBudget {
  constructor(private transactionRepository: TransactionRepository) {}

  async execute(budgetId: string): Promise<Transaction[]> {
    return this.transactionRepository.getAll({ budgetId });
  }
}
