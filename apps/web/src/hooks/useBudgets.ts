import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

export interface BudgetCategory {
  id: string;
  category: { id: string; name: string; color: string; icon: string };
  limitAmount: string;
  spent: string;
}

export interface Budget {
  id: string;
  year: number;
  month: number;
  totalLimit: string;
  categories: BudgetCategory[];
}

export interface BudgetCategoryInput {
  categoryId: string;
  limitAmount: string;
}

export interface CreateBudgetInput {
  year: number;
  month: number;
  totalLimit: string;
  categories: BudgetCategoryInput[];
}

export interface UpdateBudgetInput {
  totalLimit?: string;
  categories?: BudgetCategoryInput[];
}

export function useBudgets(filterYear?: number, filterMonth?: number) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filterYear !== undefined) params.year = String(filterYear);
      if (filterMonth !== undefined) params.month = String(filterMonth);

      const res = await api.get<{ success: boolean; data: Budget[] }>("/budgets", { params });
      setBudgets(res.data.data);
    } catch {
      setError("Failed to load budgets");
    } finally {
      setIsLoading(false);
    }
  }, [filterYear, filterMonth]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  async function createBudget(input: CreateBudgetInput) {
    const res = await api.post<{ success: boolean; data: Budget }>("/budgets", input);
    setBudgets((prev) => [res.data.data, ...prev]);
    return res.data.data;
  }

  async function updateBudget(id: string, input: UpdateBudgetInput) {
    const res = await api.patch<{ success: boolean; data: Budget }>(`/budgets/${id}`, input);
    setBudgets((prev) => prev.map((b) => (b.id === id ? res.data.data : b)));
    return res.data.data;
  }

  async function deleteBudget(id: string) {
    await api.delete(`/budgets/${id}`);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }

  return {
    budgets,
    isLoading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
    refetch: fetchBudgets,
  };
}
