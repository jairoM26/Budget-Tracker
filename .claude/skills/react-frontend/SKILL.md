---
name: react-frontend
description: Use this skill whenever building, modifying, or reviewing React frontend code — components, pages, hooks, context, routing, forms, API calls, or styling. Triggers on any mention of React, components, hooks, Tailwind, Recharts, Vite, frontend, UI, forms, or client-side state management. Also use when discussing frontend architecture, component structure, or responsive design patterns.
---

# React Frontend — Budget Tracker

This skill defines the architecture and conventions for the React frontend in the Budget Tracker project.

## Tech Stack

- **React 18** with functional components and hooks
- **Vite** for development and production builds
- **Tailwind CSS** for utility-first styling
- **Recharts** for data visualization (charts)
- **TypeScript** in strict mode

## Project Structure

```
apps/web/src/
├── components/       # Reusable UI components
│   ├── ui/           # Generic UI primitives (Button, Input, Modal, Card)
│   ├── layout/       # Layout components (Header, Sidebar, PageWrapper)
│   └── forms/        # Form components (TransactionForm, CategoryForm)
├── pages/            # Route-level page components
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── TransactionsPage.tsx
│   ├── BudgetsPage.tsx
│   ├── CategoriesPage.tsx
│   └── RecurringRulesPage.tsx
├── hooks/            # Custom React hooks
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── useCategories.ts
├── context/          # React context providers
│   └── AuthContext.tsx
├── services/         # API client functions
│   └── api.ts
├── types/            # Frontend-specific types (re-exports from @budget-app/shared)
├── utils/            # Helper functions
├── App.tsx           # Root component with routing
├── main.tsx          # Entry point
└── index.css         # Tailwind imports and global styles
```

## Component Conventions

### Functional components only

All components are functional components using hooks. No class components.

```typescript
import { useState } from "react";

interface CategoryCardProps {
  name: string;
  color: string;
  icon: string;
  spent: string;
  limit: string;
}

export function CategoryCard({ name, color, icon, spent, limit }: CategoryCardProps) {
  const percentage = parseFloat(spent) / parseFloat(limit) * 100;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <h3 className="font-medium">{name}</h3>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        {spent} / {limit}
      </p>
      <div className="mt-2 h-2 rounded-full bg-gray-200">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
```

### Props typing

Always define props with an explicit interface. Use `children` from `React.ReactNode` when needed. Provide default values for optional props.

### File naming

- Components: `PascalCase.tsx` (e.g., `TransactionList.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useAuth.ts`)
- Utilities: `camelCase.ts` (e.g., `formatCurrency.ts`)
- One component per file as the default export or named export

## Authentication Context

Auth state is managed via React Context. The access token lives in memory (a state variable), never in localStorage.

```typescript
import { createContext, useContext, useState, useCallback, useEffect } from "react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, attempt silent refresh
  useEffect(() => {
    refreshToken()
      .catch(() => {}) // Silent failure — user is simply not logged in
      .finally(() => setIsLoading(false));
  }, []);

  // ... login, register, logout, refreshToken implementations

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

## Protected Route Wrapper

Routes that require authentication redirect to login if the user is not authenticated.

```typescript
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
```

## API Client

A centralized API client handles authentication headers and token refresh automatically.

```typescript
const API_URL = import.meta.env.VITE_API_URL;

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // Include cookies for refresh token
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error);
  }

  return data;
}
```

## Styling with Tailwind

- Use Tailwind utility classes directly on elements. No custom CSS unless absolutely necessary.
- Use consistent spacing, color, and typography from the Tailwind config.
- Mobile-first responsive design: start with mobile layout, use `sm:`, `md:`, `lg:` breakpoints for larger screens.
- Extract repeated patterns into reusable components, not custom CSS classes.

## Charts with Recharts

Use Recharts for all data visualization. Wrap chart components to handle the Budget Tracker data format.

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface SpendingChartProps {
  data: Array<{
    category: string;
    spent: number;
    limit: number;
    color: string;
  }>;
}

export function SpendingByCategory({ data }: SpendingChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="category" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="spent" fill="#6366f1" />
        <Bar dataKey="limit" fill="#e5e7eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

## Shared Types

Import domain types from the shared package. Never redefine them in the frontend.

```typescript
import { TransactionType, Category, Transaction } from "@budget-app/shared";
```

## Form Handling

Forms use controlled components with local state. Validation errors from the API are displayed at the field level.

For v1, use simple `useState`-based form state. React Hook Form + Zod resolver is a v2 consideration when forms become more complex.

## Error Handling

- API errors are caught and displayed in the UI as user-friendly messages.
- Network errors show a generic "Connection error" message.
- 401 errors trigger a silent token refresh attempt. If that fails, redirect to login.
- Never show raw error objects or stack traces to the user.
