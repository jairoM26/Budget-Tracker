import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

export interface TransactionCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  description: string;
  notes: string | null;
  date: string;
  category: TransactionCategory;
  recurringRuleId: string | null;
}

export interface TransactionMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionFilters {
  type?: "INCOME" | "EXPENSE" | "";
  categoryId?: string;
  from?: string;
  to?: string;
}

export interface CreateTransactionInput {
  amount: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  description: string;
  notes?: string;
  date: string;
}

export interface UpdateTransactionInput {
  amount?: string;
  type?: "INCOME" | "EXPENSE";
  categoryId?: string;
  description?: string;
  notes?: string | null;
  date?: string;
}

const PAGE_SIZE = 20;

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<TransactionMeta>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>({});

  const fetchTransactions = useCallback(async (currentPage: number, currentFilters: TransactionFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(PAGE_SIZE),
      };
      if (currentFilters.type) params.type = currentFilters.type;
      if (currentFilters.categoryId) params.categoryId = currentFilters.categoryId;
      if (currentFilters.from) params.from = currentFilters.from;
      if (currentFilters.to) params.to = currentFilters.to;

      const res = await api.get<{ success: boolean; data: Transaction[]; meta: TransactionMeta }>(
        "/transactions",
        { params }
      );
      setTransactions(res.data.data);
      setMeta(res.data.meta);
    } catch {
      setError("Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(page, filters);
  }, [fetchTransactions, page, filters]);

  function applyFilters(newFilters: TransactionFilters) {
    setFilters(newFilters);
    setPage(1);
  }

  async function createTransaction(input: CreateTransactionInput) {
    const res = await api.post<{ success: boolean; data: Transaction }>("/transactions", input);
    await fetchTransactions(page, filters);
    return res.data.data;
  }

  async function updateTransaction(id: string, input: UpdateTransactionInput) {
    const res = await api.patch<{ success: boolean; data: Transaction }>(`/transactions/${id}`, input);
    await fetchTransactions(page, filters);
    return res.data.data;
  }

  async function deleteTransaction(id: string) {
    await api.delete(`/transactions/${id}`);
    // If last item on page > 1, go back one page
    const newTotal = meta.total - 1;
    const newTotalPages = Math.ceil(newTotal / PAGE_SIZE);
    const newPage = page > newTotalPages && newTotalPages > 0 ? newTotalPages : page;
    if (newPage !== page) {
      setPage(newPage);
    } else {
      await fetchTransactions(page, filters);
    }
  }

  return {
    transactions,
    meta,
    isLoading,
    error,
    page,
    setPage,
    filters,
    applyFilters,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: () => fetchTransactions(page, filters),
  };
}
