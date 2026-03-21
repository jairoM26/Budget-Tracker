import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Category } from "../../hooks/useCategories";
import { Transaction, CreateTransactionInput } from "../../hooks/useTransactions";

interface TransactionFormProps {
  initial?: Transaction | null;
  categories: Category[];
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  onCancel: () => void;
}

function toLocalDateString(isoString: string): string {
  // Convert ISO date to YYYY-MM-DD for date input
  return isoString.slice(0, 10);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({ initial, categories, onSubmit, onCancel }: TransactionFormProps) {
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE");
  const [categoryId, setCategoryId] = useState(initial?.category.id ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [date, setDate] = useState(initial ? toLocalDateString(initial.date) : todayString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAmount(initial?.amount ?? "");
    setType(initial?.type ?? "EXPENSE");
    setCategoryId(initial?.category.id ?? "");
    setDescription(initial?.description ?? "");
    setNotes(initial?.notes ?? "");
    setDate(initial ? toLocalDateString(initial.date) : todayString());
    setError("");
  }, [initial]);

  // Filter categories by type (show all when no match to avoid empty select)
  const relevantCategories = categories.filter(
    (c) => c.type === null || c.type === type
  );
  const selectableCategories = relevantCategories.length > 0 ? relevantCategories : categories;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side amount format check
    if (!/^\d{1,10}\.\d{2}$/.test(amount)) {
      setError("Amount must have exactly 2 decimal places (e.g. 50.00)");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount,
        type,
        categoryId,
        description,
        notes: notes || undefined,
        date,
      });
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="tx-amount">Amount</Label>
          <Input
            id="tx-amount"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-type">Type</Label>
          <select
            id="tx-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as "INCOME" | "EXPENSE");
              setCategoryId(""); // reset category when type changes
            }}
            className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tx-category">Category</Label>
        <select
          id="tx-category"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Select a category…</option>
          {selectableCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tx-description">Description</Label>
        <Input
          id="tx-description"
          required
          placeholder="e.g. Weekly groceries"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="tx-date">Date</Label>
          <Input
            id="tx-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-notes">Notes (optional)</Label>
          <Input
            id="tx-notes"
            placeholder="Any extra details…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}
