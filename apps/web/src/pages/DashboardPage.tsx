import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-sm">Budget Tracker</span>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/categories" className="hover:text-foreground transition-colors">
                Categories
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Welcome, {user?.name}!
        </h2>
        <p className="text-muted-foreground mb-6">
          Your dashboard is coming soon.
        </p>
        <Link to="/categories">
          <Button variant="secondary">Manage categories</Button>
        </Link>
      </main>
    </div>
  );
}
