import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Category } from "../../hooks/useCategories";
import { Budget, BudgetCategoryInput, CreateBudgetInput } from "../../hooks/useBudgets";

interface BudgetFormProps {
  initial?: Budget | null;
  categories: Category[];
  onSubmit: (data: CreateBudgetInput) => Promise<void>;
  onCancel: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function currentYear() {
  return new Date().getFullYear();
}

function currentMonth() {
  return new Date().getMonth() + 1;
}

export function BudgetForm({ initial, categories, onSubmit, onCancel }: BudgetFormProps) {
  const [year, setYear] = useState(initial?.year ?? currentYear());
  const [month, setMonth] = useState(initial?.month ?? currentMonth());
  const [totalLimit, setTotalLimit] = useState(initial?.totalLimit ?? "");
  const [categoryLimits, setCategoryLimits] = useState<BudgetCategoryInput[]>(
    initial?.categories.map((c) => ({ categoryId: c.category.id, limitAmount: c.limitAmount })) ?? []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setYear(initial?.year ?? currentYear());
    setMonth(initial?.month ?? currentMonth());
    setTotalLimit(initial?.totalLimit ?? "");
    setCategoryLimits(
      initial?.categories.map((c) => ({ categoryId: c.category.id, limitAmount: c.limitAmount })) ?? []
    );
    setError("");
  }, [initial]);

  function setCategoryLimit(categoryId: string, limitAmount: string) {
    setCategoryLimits((prev) => {
      const existing = prev.find((c) => c.categoryId === categoryId);
      if (existing) {
        return prev.map((c) => (c.categoryId === categoryId ? { categoryId, limitAmount } : c));
      }
      return [...prev, { categoryId, limitAmount }];
    });
  }

  function getCategoryLimit(categoryId: string) {
    return categoryLimits.find((c) => c.categoryId === categoryId)?.limitAmount ?? "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^\d{1,10}\.\d{2}$/.test(totalLimit)) {
      setError("Total limit must have exactly 2 decimal places (e.g. 3000.00)");
      return;
    }

    const validCategories = categoryLimits.filter((c) => c.limitAmount.trim() !== "");
    for (const c of validCategories) {
      if (!/^\d{1,10}\.\d{2}$/.test(c.limitAmount)) {
        setError("All category limits must have exactly 2 decimal places (e.g. 400.00)");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ year, month, totalLimit, categories: validCategories });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string; fields?: Record<string, string> } } } };
      const fields = apiErr?.response?.data?.error?.fields;
      setError(
        fields
          ? Object.values(fields).join(" · ")
          : (apiErr?.response?.data?.error?.message ?? "Something went wrong")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md px-3 py-2">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="budget-year">Year</Label>
          <Input
            id="budget-year"
            type="number"
            required
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            disabled={!!initial}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budget-month">Month</Label>
          <select
            id="budget-month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            disabled={!!initial}
            className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budget-total">Total limit</Label>
          <Input
            id="budget-total"
            required
            placeholder="3000.00"
            value={totalLimit}
            onChange={(e) => setTotalLimit(e.target.value)}
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>Category limits (optional)</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm flex-1 min-w-0 truncate">{cat.name}</span>
                <Input
                  placeholder="0.00"
                  value={getCategoryLimit(cat.id)}
                  onChange={(e) => setCategoryLimit(cat.id, e.target.value)}
                  className="w-28 h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : initial ? "Save changes" : "Create budget"}
        </Button>
      </div>
    </form>
  );
}
