import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Category } from "../../hooks/useCategories";

interface CategoryFormProps {
  initial?: Category | null;
  onSubmit: (data: Omit<Category, "id">) => Promise<void>;
  onCancel: () => void;
}

export function CategoryForm({ initial, onSubmit, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [icon, setIcon] = useState(initial?.icon ?? "tag");
  const [type, setType] = useState<"INCOME" | "EXPENSE" | "">(initial?.type ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(initial?.name ?? "");
    setColor(initial?.color ?? "#6366f1");
    setIcon(initial?.icon ?? "tag");
    setType(initial?.type ?? "");
    setError("");
  }, [initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({ name, color, icon, type: type === "" ? null : type });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string; fields?: Record<string, string> } } } };
      const fields = apiErr?.response?.data?.error?.fields;
      setError(fields ? Object.values(fields).join(" · ") : (apiErr?.response?.data?.error?.message ?? "Something went wrong"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md px-3 py-2">{error}</div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Name</Label>
        <Input
          id="cat-name"
          required
          placeholder="e.g. Groceries"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cat-color">Color</Label>
          <div className="flex items-center gap-2">
            <input
              id="cat-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
            />
            <span className="text-sm text-muted-foreground font-mono">{color}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-type">Type</Label>
          <select
            id="cat-type"
            value={type}
            onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE" | "")}
            className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Both</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cat-icon">Icon name</Label>
        <Input
          id="cat-icon"
          placeholder="e.g. utensils, car, home"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : initial ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
