import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

export interface RecurringRuleCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface RecurringRule {
  id: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  description: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  nextDue: string;
  endDate: string | null;
  active: boolean;
  category: RecurringRuleCategory;
}

export interface CreateRecurringRuleInput {
  amount: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  description: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string;
  endDate?: string | null;
}

export interface UpdateRecurringRuleInput {
  amount?: string;
  type?: "INCOME" | "EXPENSE";
  categoryId?: string;
  description?: string;
  frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  nextDue?: string;
  endDate?: string | null;
  active?: boolean;
}

export function useRecurringRules() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: RecurringRule[] }>("/recurring-rules");
      setRules(res.data.data);
    } catch {
      setError("Failed to load recurring rules");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  async function createRule(input: CreateRecurringRuleInput) {
    const res = await api.post<{ success: boolean; data: RecurringRule }>("/recurring-rules", input);
    setRules((prev) => [...prev, res.data.data]);
    return res.data.data;
  }

  async function updateRule(id: string, input: UpdateRecurringRuleInput) {
    const res = await api.patch<{ success: boolean; data: RecurringRule }>(`/recurring-rules/${id}`, input);
    setRules((prev) => prev.map((r) => (r.id === id ? res.data.data : r)));
    return res.data.data;
  }

  async function deleteRule(id: string) {
    await api.delete(`/recurring-rules/${id}`);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  return {
    rules,
    isLoading,
    error,
    createRule,
    updateRule,
    deleteRule,
    refetch: fetchRules,
  };
}
