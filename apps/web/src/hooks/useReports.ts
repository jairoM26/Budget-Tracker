import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

export interface MonthlySummary {
  year: number;
  month: number;
  totalIncome: string;
  totalExpenses: string;
  netBalance: string;
  currency: string;
}

export interface CategorySpending {
  category: { id: string; name: string; color: string };
  spent: string;
  budgetLimit: string | null;
  percentage: number | null;
}

export interface MonthlyTrendEntry {
  year: number;
  month: number;
  totalIncome: string;
  totalExpenses: string;
}

export function useMonthlySummary(year: number, month: number) {
  const [data, setData] = useState<MonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/reports/monthly-summary", { params: { year, month } });
      setData(res.data.data);
    } catch {
      setError("Failed to load monthly summary");
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

export function useSpendingByCategory(year: number, month: number) {
  const [data, setData] = useState<CategorySpending[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/reports/spending-by-category", { params: { year, month } });
      setData(res.data.data);
    } catch {
      setError("Failed to load spending by category");
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, error };
}

export function useMonthlyTrend(months: number = 6) {
  const [data, setData] = useState<MonthlyTrendEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/reports/monthly-trend", { params: { months } });
      setData(res.data.data);
    } catch {
      setError("Failed to load monthly trend");
    } finally {
      setIsLoading(false);
    }
  }, [months]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, error };
}
