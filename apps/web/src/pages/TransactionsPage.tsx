import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTransactions, Transaction, TransactionFilters, CreateTransactionInput } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { TransactionForm } from "../components/forms/TransactionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatSignedAmount } from "../lib/currency";
import type { Currency } from "../lib/currency";
import { CurrencySelector } from "../components/CurrencySelector";

type FormMode = "hidden" | "create" | "edit";

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


export function TransactionsPage() {
  const { user, logout } = useAuth();
  const {
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
  } = useTransactions();
  const { categories } = useCategories();

  const [formMode, setFormMode] = useState<FormMode>("hidden");
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [actionError, setActionError] = useState("");

  // Local filter inputs (applied on submit)
  const [filterType, setFilterType] = useState<"" | "INCOME" | "EXPENSE">(filters.type ?? "");
  const [filterCategoryId, setFilterCategoryId] = useState(filters.categoryId ?? "");
  const [filterFrom, setFilterFrom] = useState(filters.from ?? "");
  const [filterTo, setFilterTo] = useState(filters.to ?? "");

  function openCreate() {
    setEditTarget(null);
    setFormMode("create");
    setDeleteConfirmId(null);
    setActionError("");
  }

  function openEdit(tx: Transaction) {
    setEditTarget(tx);
    setFormMode("edit");
    setDeleteConfirmId(null);
    setActionError("");
  }

  function closeForm() {
    setFormMode("hidden");
    setEditTarget(null);
    setActionError("");
  }

  async function handleFormSubmit(data: CreateTransactionInput) {
    if (formMode === "edit" && editTarget) {
      await updateTransaction(editTarget.id, data);
    } else {
      await createTransaction(data);
    }
    closeForm();
  }

  function handleApplyFilters() {
    const newFilters: TransactionFilters = {};
    if (filterType) newFilters.type = filterType;
    if (filterCategoryId) newFilters.categoryId = filterCategoryId;
    if (filterFrom) newFilters.from = filterFrom;
    if (filterTo) newFilters.to = filterTo;
    applyFilters(newFilters);
  }

  function handleClearFilters() {
    setFilterType("");
    setFilterCategoryId("");
    setFilterFrom("");
    setFilterTo("");
    applyFilters({});
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteTransaction(id);
      setDeleteConfirmId(null);
    } catch {
      setDeleteError("Failed to delete transaction");
    } finally {
      setIsDeleting(false);
    }
  }

  const hasActiveFilters = !!(filters.type || filters.categoryId || filters.from || filters.to);

  const typeBadgeClass = (type: "INCOME" | "EXPENSE") =>
    type === "INCOME"
      ? "bg-green-500/10 text-green-400"
      : "bg-red-500/10 text-red-400";

  const amountClass = (type: "INCOME" | "EXPENSE") =>
    type === "INCOME" ? "text-green-400" : "text-red-400";

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
              <Link to="/transactions" className="text-foreground font-medium">
                Transactions
              </Link>
              <Link to="/budgets" className="hover:text-foreground transition-colors">
                Budgets
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <CurrencySelector />
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Transactions</h1>
          {formMode === "hidden" && (
            <Button size="sm" onClick={openCreate}>
              New transaction
            </Button>
          )}
        </div>

        {/* Create / Edit form */}
        {formMode !== "hidden" && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {formMode === "edit" ? "Edit transaction" : "New transaction"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionForm
                initial={editTarget}
                categories={categories}
                onSubmit={handleFormSubmit}
                onCancel={closeForm}
              />
              {actionError && (
                <p className="mt-2 text-sm text-destructive">{actionError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "" | "INCOME" | "EXPENSE")}
                className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>

              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <Input
                type="date"
                placeholder="From"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="h-9"
              />

              <Input
                type="date"
                placeholder="To"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )}
              <Button size="sm" onClick={handleApplyFilters}>
                Apply filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading / error states */}
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-12">Loading transactions…</p>
        )}
        {error && !isLoading && (
          <p className="text-sm text-destructive text-center py-12">{error}</p>
        )}

        {/* Empty state */}
        {!isLoading && !error && transactions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            {hasActiveFilters ? "No transactions match the current filters." : "No transactions yet."}
          </p>
        )}

        {/* Transaction list */}
        {!isLoading && !error && transactions.length > 0 && (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const isConfirming = deleteConfirmId === tx.id;

              return (
                <Card key={tx.id} className="overflow-hidden">
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Category color swatch */}
                    <div
                      className="h-8 w-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tx.category.color }}
                    />

                    {/* Description + category + date */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tx.category.name} · {formatDate(tx.date)}
                      </p>
                    </div>

                    {/* Amount + type badge */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${typeBadgeClass(tx.type)}`}
                      >
                        {tx.type === "INCOME" ? "Income" : "Expense"}
                      </span>
                      <span className={`font-mono font-medium text-sm ${amountClass(tx.type)}`}>
                        {formatSignedAmount(tx.amount, tx.type, (user?.currency ?? "USD") as Currency)}
                      </span>
                    </div>

                    {/* Actions */}
                    {!isConfirming && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(tx)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteConfirmId(tx.id);
                            setDeleteError("");
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Notes row */}
                  {tx.notes && !isConfirming && (
                    <div className="px-4 pb-3 -mt-1">
                      <p className="text-xs text-muted-foreground italic">{tx.notes}</p>
                    </div>
                  )}

                  {/* Delete confirmation */}
                  {isConfirming && (
                    <div className="border-t border-border px-4 py-3 bg-secondary/30 flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Delete "{tx.description}"?
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
                          onClick={() => handleDelete(tx.id)}
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

        {/* Pagination */}
        {!isLoading && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              {meta.total} transaction{meta.total !== 1 ? "s" : ""} · Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Total count when only one page */}
        {!isLoading && meta.total > 0 && meta.totalPages <= 1 && (
          <p className="text-sm text-muted-foreground mt-4">
            {meta.total} transaction{meta.total !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
  );
}
