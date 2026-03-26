import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRecurringRules, RecurringRule, CreateRecurringRuleInput } from "../hooks/useRecurringRules";
import { useCategories } from "../hooks/useCategories";
import { RecurringRuleForm } from "../components/forms/RecurringRuleForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "../components/AppHeader";
import { formatAmount } from "../lib/currency";
import type { Currency } from "../lib/currency";

type FormMode = "hidden" | "create" | "edit";

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RecurringRulesPage() {
  const { user } = useAuth();
  const userCurrency = (user?.currency ?? "USD") as Currency;
  const { rules, isLoading, error, createRule, updateRule, deleteRule } = useRecurringRules();
  const { categories } = useCategories();

  const [formMode, setFormMode] = useState<FormMode>("hidden");
  const [editTarget, setEditTarget] = useState<RecurringRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function openCreate() {
    setEditTarget(null);
    setFormMode("create");
    setDeleteConfirmId(null);
  }

  function openEdit(rule: RecurringRule) {
    setEditTarget(rule);
    setFormMode("edit");
    setDeleteConfirmId(null);
  }

  function closeForm() {
    setFormMode("hidden");
    setEditTarget(null);
  }

  async function handleFormSubmit(data: CreateRecurringRuleInput) {
    if (formMode === "edit" && editTarget) {
      await updateRule(editTarget.id, {
        ...data,
        nextDue: data.startDate,
      });
    } else {
      await createRule(data);
    }
    closeForm();
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteRule(id);
      setDeleteConfirmId(null);
    } catch {
      setDeleteError("Failed to delete rule");
    } finally {
      setIsDeleting(false);
    }
  }

  const typeBadgeClass = (type: "INCOME" | "EXPENSE") =>
    type === "INCOME"
      ? "bg-green-500/10 text-green-400"
      : "bg-red-500/10 text-red-400";

  return (
    <div className="min-h-screen bg-muted/40">
      <AppHeader activePath="/recurring-rules" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Recurring Rules</h1>
          {formMode === "hidden" && (
            <Button size="sm" onClick={openCreate}>
              New rule
            </Button>
          )}
        </div>

        {/* Create / Edit form */}
        {formMode !== "hidden" && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {formMode === "edit" ? "Edit rule" : "New recurring rule"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecurringRuleForm
                initial={editTarget}
                categories={categories}
                onSubmit={handleFormSubmit}
                onCancel={closeForm}
              />
            </CardContent>
          </Card>
        )}

        {/* Loading / error */}
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-12">Loading rules…</p>
        )}
        {error && !isLoading && (
          <p className="text-sm text-destructive text-center py-12">{error}</p>
        )}

        {/* Empty state */}
        {!isLoading && !error && rules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No recurring rules yet.</p>
        )}

        {/* Rules list */}
        {!isLoading && !error && rules.length > 0 && (
          <div className="space-y-2">
            {rules.map((rule) => {
              const isConfirming = deleteConfirmId === rule.id;

              return (
                <Card key={rule.id} className="overflow-hidden">
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Category color swatch */}
                    <div
                      className="h-8 w-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: rule.category.color }}
                    />

                    {/* Description + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{rule.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rule.category.name} · {FREQUENCY_LABELS[rule.frequency]} · Next: {formatDate(rule.nextDue)}
                        {rule.endDate && ` · Ends: ${formatDate(rule.endDate)}`}
                      </p>
                    </div>

                    {/* Amount + badges */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {!rule.active && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          Paused
                        </span>
                      )}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${typeBadgeClass(rule.type)}`}
                      >
                        {rule.type === "INCOME" ? "Income" : "Expense"}
                      </span>
                      <span className="font-mono font-medium text-sm">
                        {formatAmount(rule.amount, userCurrency)}
                      </span>
                    </div>

                    {/* Actions */}
                    {!isConfirming && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateRule(rule.id, { active: !rule.active })
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {rule.active ? "Pause" : "Resume"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(rule)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteConfirmId(rule.id);
                            setDeleteError("");
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Delete confirmation */}
                  {isConfirming && (
                    <div className="border-t border-border px-4 py-3 bg-secondary/30 flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Delete &quot;{rule.description}&quot;?
                      </p>
                      {deleteError && (
                        <p className="text-xs text-destructive">{deleteError}</p>
                      )}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting…" : "Confirm delete"}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
