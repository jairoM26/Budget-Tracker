import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CurrencySelector } from "./CurrencySelector";

const NAV_LINKS = [
  { to: "/categories", label: "Categories" },
  { to: "/transactions", label: "Transactions" },
  { to: "/budgets", label: "Budgets" },
  { to: "/recurring-rules", label: "Recurring" },
];

export function AppHeader({ activePath }: { activePath?: string }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-background border-b">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/" className="font-semibold text-sm">
            Budget Tracker
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={
                  activePath === link.to
                    ? "text-foreground font-medium"
                    : "hover:text-foreground transition-colors"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <CurrencySelector />
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
            Sign out
          </Button>

          {/* Mobile menu button */}
          <button
            className="sm:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div className="sm:hidden border-t bg-background px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`block py-2 px-2 rounded text-sm ${
                activePath === link.to
                  ? "text-foreground font-medium bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t pt-2 mt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
