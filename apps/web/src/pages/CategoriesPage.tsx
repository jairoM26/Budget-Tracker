import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCategories, Category } from "../hooks/useCategories";
import { CategoryForm } from "../components/forms/CategoryForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

type DeleteState =
  | { status: "idle" }
  | { status: "confirming"; categoryId: string }
  | { status: "reassigning"; categoryId: string; message: string };

export function CategoriesPage() {
  const { user, logout } = useAuth();
  const { categories, isLoading, error, createCategory, updateCategory, deleteCategory, reassignCategory } =
    useCategories();

  const [formMode, setFormMode] = useState<"hidden" | "create" | "edit">("hidden");
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>({ status: "idle" });
  const [reassignTargetId, setReassignTargetId] = useState("");
  const [actionError, setActionError] = useState("");
  const [isActioning, setIsActioning] = useState(false);

  function openCreate() {
    setEditTarget(null);
    setFormMode("create");
    setDeleteState({ status: "idle" });
  }

  function openEdit(category: Category) {
    setEditTarget(category);
    setFormMode("edit");
    setDeleteState({ status: "idle" });
  }

  function closeForm() {
    setFormMode("hidden");
    setEditTarget(null);
  }

  async function handleFormSubmit(data: Omit<Category, "id">) {
    if (formMode === "edit" && editTarget) {
      await updateCategory(editTarget.id, data);
    } else {
      await createCategory(data);
    }
    closeForm();
  }

  function confirmDelete(categoryId: string) {
    setDeleteState({ status: "confirming", categoryId });
    setActionError("");
  }

  function cancelDelete() {
    setDeleteState({ status: "idle" });
    setActionError("");
  }

  async function handleDelete(categoryId: string) {
    setIsActioning(true);
    setActionError("");
    try {
      await deleteCategory(categoryId);
      setDeleteState({ status: "idle" });
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
      if (apiErr?.response?.status === 409) {
        const message = apiErr.response?.data?.error?.message ?? "This category has linked transactions.";
        setDeleteState({ status: "reassigning", categoryId, message });
        setReassignTargetId("");
      } else {
        setActionError(apiErr?.response?.data?.error?.message ?? "Failed to delete category");
      }
    } finally {
      setIsActioning(false);
    }
  }

  async function handleReassignAndDelete() {
    if (!reassignTargetId || deleteState.status !== "reassigning") return;
    setIsActioning(true);
    setActionError("");
    try {
      await reassignCategory(deleteState.categoryId, reassignTargetId);
      setDeleteState({ status: "idle" });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      setActionError(apiErr?.response?.data?.error?.message ?? "Failed to reassign category");
    } finally {
      setIsActioning(false);
    }
  }

  const typeLabel = (type: Category["type"]) => {
    if (type === "INCOME") return "Income";
    if (type === "EXPENSE") return "Expense";
    return "Both";
  };

  const typeBadgeClass = (type: Category["type"]) => {
    if (type === "INCOME") return "bg-green-500/10 text-green-400";
    if (type === "EXPENSE") return "bg-red-500/10 text-red-400";
    return "bg-secondary text-secondary-foreground";
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold text-sm">
              Budget Tracker
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/categories" className="text-foreground font-medium">
                Categories
              </Link>
              <Link to="/transactions" className="hover:text-foreground transition-colors">
                Transactions
              </Link>
              <Link to="/budgets" className="hover:text-foreground transition-colors">
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
          <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
          {formMode === "hidden" && (
            <Button size="sm" onClick={openCreate}>
              New category
            </Button>
          )}
        </div>

        {/* Create / Edit form */}
        {formMode !== "hidden" && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {formMode === "edit" ? "Edit category" : "New category"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryForm initial={editTarget} onSubmit={handleFormSubmit} onCancel={closeForm} />
            </CardContent>
          </Card>
        )}

        {/* Loading / error states */}
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-12">Loading categories…</p>
        )}
        {error && !isLoading && (
          <p className="text-sm text-destructive text-center py-12">{error}</p>
        )}

        {/* Category list */}
        {!isLoading && !error && categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No categories yet.</p>
        )}

        {!isLoading && !error && categories.length > 0 && (
          <div className="space-y-2">
            {categories.map((cat) => {
              const isConfirming = deleteState.status === "confirming" && deleteState.categoryId === cat.id;
              const isReassigning = deleteState.status === "reassigning" && deleteState.categoryId === cat.id;
              const otherCategories = categories.filter((c) => c.id !== cat.id);

              return (
                <Card key={cat.id} className="overflow-hidden">
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Color swatch */}
                    <div
                      className="h-8 w-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />

                    {/* Name + type */}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{cat.name}</span>
                      <span
                        className={`ml-2 inline-block text-xs px-1.5 py-0.5 rounded-full ${typeBadgeClass(cat.type)}`}
                      >
                        {typeLabel(cat.type)}
                      </span>
                    </div>

                    {/* Actions */}
                    {!isConfirming && !isReassigning && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(cat)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(cat.id)}
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
                      <p className="text-sm text-muted-foreground">Delete "{cat.name}"?</p>
                      {actionError && (
                        <p className="text-xs text-destructive">{actionError}</p>
                      )}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={cancelDelete} disabled={isActioning}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(cat.id)}
                          disabled={isActioning}
                        >
                          {isActioning ? "Deleting…" : "Confirm delete"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reassign flow */}
                  {isReassigning && (
                    <div className="border-t border-border px-4 py-3 bg-secondary/30 space-y-3">
                      <p className="text-sm text-amber-400">{deleteState.message}</p>
                      <div className="flex items-center gap-3">
                        <select
                          value={reassignTargetId}
                          onChange={(e) => setReassignTargetId(e.target.value)}
                          className="flex-1 h-9 rounded-md border border-input bg-input px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Select a category to reassign to…</option>
                          {otherCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <Button variant="ghost" size="sm" onClick={cancelDelete} disabled={isActioning}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleReassignAndDelete}
                          disabled={!reassignTargetId || isActioning}
                        >
                          {isActioning ? "Reassigning…" : "Reassign & delete"}
                        </Button>
                      </div>
                      {actionError && (
                        <p className="text-xs text-destructive">{actionError}</p>
                      )}
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
