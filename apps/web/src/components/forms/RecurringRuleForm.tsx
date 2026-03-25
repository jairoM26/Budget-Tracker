import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RecurringRule, CreateRecurringRuleInput } from "../../hooks/useRecurringRules";
import type { Category } from "../../hooks/useCategories";

interface RecurringRuleFormProps {
  initial: RecurringRule | null;
  categories: Category[];
  onSubmit: (data: CreateRecurringRuleInput) => Promise<void>;
  onCancel: () => void;
}

const FREQUENCIES = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
] as const;

export function RecurringRuleForm({ initial, categories, onSubmit, onCancel }: RecurringRuleFormProps) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE");
  const [categoryId, setCategoryId] = useState(initial?.category.id ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [frequency, setFrequency] = useState(initial?.frequency ?? "MONTHLY");
  const [startDate, setStartDate] = useState(
    initial ? initial.nextDue.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredCategories = categories.filter(
    (c) => c.type === null || c.type === type
  );

  function handleTypeChange(newType: "INCOME" | "EXPENSE") {
    setType(newType);
    setCategoryId("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        categoryId,
        amount: num.toFixed(2),
        description,
        frequency,
        startDate,
        endDate: endDate || null,
      });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(apiErr?.response?.data?.error?.message ?? "Failed to save rule");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md px-3 py-2">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as "INCOME" | "EXPENSE")}
            className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select…</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rr-amount">Amount</Label>
          <Input
            id="rr-amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Frequency</Label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as CreateRecurringRuleInput["frequency"])}
            className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rr-description">Description</Label>
        <Input
          id="rr-description"
          required
          placeholder="Monthly rent"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rr-startDate">{initial ? "Next due" : "Start date"}</Label>
          <Input
            id="rr-startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rr-endDate">End date (optional)</Label>
          <Input
            id="rr-endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : initial ? "Update rule" : "Create rule"}
        </Button>
      </div>
    </form>
  );
}
