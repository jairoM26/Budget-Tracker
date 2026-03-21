import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="font-semibold text-sm">Budget Tracker</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Welcome, {user?.name}!
        </h2>
        <p className="text-muted-foreground">
          Your dashboard is coming soon.
        </p>
      </main>
    </div>
  );
}
