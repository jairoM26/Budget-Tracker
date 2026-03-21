import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: "INCOME" | "EXPENSE" | null;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ success: boolean; data: Category[] }>("/categories");
      setCategories(res.data.data);
    } catch {
      setError("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function createCategory(input: Omit<Category, "id">) {
    const res = await api.post<{ success: boolean; data: Category }>("/categories", input);
    setCategories((prev) => [...prev, res.data.data].sort((a, b) => a.name.localeCompare(b.name)));
    return res.data.data;
  }

  async function updateCategory(id: string, input: Partial<Omit<Category, "id">>) {
    const res = await api.patch<{ success: boolean; data: Category }>(`/categories/${id}`, input);
    setCategories((prev) => prev.map((c) => (c.id === id ? res.data.data : c)));
    return res.data.data;
  }

  async function deleteCategory(id: string) {
    await api.delete(`/categories/${id}`);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function reassignCategory(sourceId: string, targetCategoryId: string) {
    await api.post(`/categories/${sourceId}/reassign`, { targetCategoryId });
    setCategories((prev) => prev.filter((c) => c.id !== sourceId));
  }

  return {
    categories,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    reassignCategory,
    refetch: fetchCategories,
  };
}
