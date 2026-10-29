export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  paymentMethod: string;
  date: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetStatus {
  id: string;
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
  status: "ok" | "warning" | "exceeded";
}

export interface BudgetSuggestion {
  category: string;
  suggested: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SummaryData {
  totals: { income: number; expense: number; balance: number };
  thisMonth: { income: number; expense: number; prevExpense: number; savingsRate: number };
  daily: Array<{ day: string; label: string; expense: number; income: number }>;
  months: Array<{ month: string; label: string; income: number; expense: number }>;
  periodCategories: Array<{ category: string; amount: number }>;
  budgetStatus: BudgetStatus[];
  suggestions: BudgetSuggestion[];
  recent: Transaction[];
  period: { from: string; to: string; key: string };
}

export interface ParsedTx {
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
}
