import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Budget là client state (local budget limits được user set) → Redux
// Transactions là server state (fetched từ API) → TanStack Query — không mix
type Budget = {
  id: string;
  name: string;
  limit: number;
  categoryId: string;
};

type BudgetState = {
  items: Budget[];
  selectedBudgetId: string | null;
};

const initialState: BudgetState = {
  items: [
    { id: 'b1', name: 'Ăn uống', limit: 3000000, categoryId: 'cat_food' },
    { id: 'b2', name: 'Di chuyển', limit: 1000000, categoryId: 'cat_transport' },
    { id: 'b3', name: 'Giải trí', limit: 500000, categoryId: 'cat_entertainment' },
  ],
  selectedBudgetId: null,
};

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    addBudget: (state, action: PayloadAction<Omit<Budget, 'id'>>) => {
      state.items.push({
        ...action.payload,
        id: `b${Date.now()}`,
      });
    },
    updateLimit: (
      state,
      action: PayloadAction<{ id: string; limit: number }>,
    ) => {
      const budget = state.items.find(b => b.id === action.payload.id);
      if (budget) {
        budget.limit = action.payload.limit;
      }
    },
    removeBudget: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(b => b.id !== action.payload);
    },
    selectBudget: (state, action: PayloadAction<string | null>) => {
      state.selectedBudgetId = action.payload;
    },
  },
});

export const { addBudget, updateLimit, removeBudget, selectBudget } =
  budgetSlice.actions;
export default budgetSlice.reducer;
