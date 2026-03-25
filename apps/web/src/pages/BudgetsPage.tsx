import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBudgets, Budget, CreateBudgetInput } from "../hooks/useBudgets";
import { useCategories } from "../hooks/useCategories";
import { BudgetForm } from "../components/forms/BudgetForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type FormMode = "hidden" | "create" | "edit";

function ProgressBar({ spent, limit }: { spent: string; limit: string }) {
  const spentNum = parseFloat(spent);
  const limitNum = parseFloat(limit);
  const pct = limitNum > 0 ? Math.min((spentNum / limitNum) * 100, 100) : 0;
  const isOver = limitNum > 0 && spentNum > limitNum;

  return (
    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${isOver ? "bg-destructive" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function formatMonth(year: number, month: number) {
  return `${MONTHS[month - 1]} ${year}`;
}

export function BudgetsPage() {
  const { user, logout } = useAuth();
  const { budgets, isLoading, error, createBudget, updateBudget, deleteBudget } = useBudgets();
  const { categories } = useCategories();

  const [formMode, setFormMode] = useState<FormMode>("hidden");
  const [editTarget, setEditTarget] = useState<Budget | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function openCreate() {
    setEditTarget(null);
    setFormMode("create");
    setDeleteConfirmId(null);
  }

  function openEdit(budget: Budget) {
    setEditTarget(budget);
    setFormMode("edit");
    setDeleteConfirmId(null);
  }

  function closeForm() {
    setFormMode("hidden");
    setEditTarget(null);
  }

  async function handleFormSubmit(data: CreateBudgetInput) {
    if (formMode === "edit" && editTarget) {
      await updateBudget(editTarget.id, {
        totalLimit: data.totalLimit,
        categories: data.categories,
      });
    } else {
      await createBudget(data);
    }
    closeForm();
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteBudget(id);
      setDeleteConfirmId(null);
    } catch {
      setDeleteError("Failed to delete budget");
    } finally {
      setIsDeleting(false);
    }
  }

  function totalSpent(budget: Budget) {
    return budget.categories
      .reduce((sum, c) => sum + parseFloat(c.spent), 0)
      .toFixed(2);
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold text-sm">
              Budget Tracker
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/categories" className="hover:text-foreground transition-colors">
                Categories
              </Link>
              <Link to="/transactions" className="hover:text-foreground transition-colors">
                Transactions
              </Link>
              <Link to="/budgets" className="text-foreground font-medium">
                Budgets
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Budgets</h1>
          {formMode === "hidden" && (
            <Button size="sm" onClick={openCreate}>
              New budget
            </Button>
          )}
        </div>

        {/* Create / Edit form */}
        {formMode !== "hidden" && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {formMode === "edit" ? "Edit budget" : "New budget"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetForm
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
          <p className="text-sm text-muted-foreground text-center py-12">Loading budgets…</p>
        )}
        {error && !isLoading && (
          <p className="text-sm text-destructive text-center py-12">{error}</p>
        )}

        {/* Empty state */}
        {!isLoading && !error && budgets.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No budgets yet.</p>
        )}

        {/* Budget list */}
        {!isLoading && !error && budgets.length > 0 && (
          <div className="space-y-4">
            {budgets.map((budget) => {
              const isConfirming = deleteConfirmId === budget.id;
              const spent = totalSpent(budget);

              return (
                <Card key={budget.id} className="overflow-hidden">
                  {/* Budget header */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{formatMonth(budget.year, budget.month)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ${spent} spent of ${budget.totalLimit} total limit
                      </p>
                    </div>

                    {/* Overall progress */}
                    <div className="w-32 hidden sm:block">
                      <ProgressBar spent={spent} limit={budget.totalLimit} />
                      <p className="text-xs text-muted-foreground text-right mt-1">
                        {parseFloat(budget.totalLimit) > 0
                          ? `${Math.round((parseFloat(spent) / parseFloat(budget.totalLimit)) * 100)}%`
                          : "—"}
                      </p>
                    </div>

                    {/* Actions */}
                    {!isConfirming && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(budget)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteConfirmId(budget.id);
                            setDeleteError("");
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Category breakdown */}
                  {budget.categories.length > 0 && !isConfirming && (
                    <div className="border-t border-border px-4 py-3 space-y-2.5">
                      {budget.categories.map((bc) => {
                        const spentNum = parseFloat(bc.spent);
                        const limitNum = parseFloat(bc.limitAmount);
                        const isOver = spentNum > limitNum;

                        return (
                          <div key={bc.id}>
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: bc.category.color }}
                              />
                              <span className="text-xs flex-1 min-w-0 truncate text-muted-foreground">
                                {bc.category.name}
                              </span>
                              <span className={`text-xs font-mono ${isOver ? "text-destructive" : "text-foreground"}`}>
                                ${bc.spent}
                              </span>
                              <span className="text-xs text-muted-foreground">/ ${bc.limitAmount}</span>
                            </div>
                            <ProgressBar spent={bc.spent} limit={bc.limitAmount} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Delete confirmation */}
                  {isConfirming && (
                    <div className="border-t border-border px-4 py-3 bg-secondary/30 flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Delete budget for {formatMonth(budget.year, budget.month)}?
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
                          onClick={() => handleDelete(budget.id)}
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
