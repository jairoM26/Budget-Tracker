import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencySelector } from "../components/CurrencySelector";
import { useMonthlySummary, useSpendingByCategory, useMonthlyTrend } from "../hooks/useReports";
import { formatAmount } from "../lib/currency";
import type { Currency } from "../lib/currency";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function MonthSelector({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (y: number, m: number) => void;
}) {
  function prev() {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  }
  function next() {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={prev}>&larr;</Button>
      <span className="text-sm font-medium min-w-[120px] text-center">
        {MONTHS[month - 1]} {year}
      </span>
      <Button variant="outline" size="sm" onClick={next}>&rarr;</Button>
    </div>
  );
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const userCurrency = (user?.currency ?? "USD") as Currency;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(year, month);
  const { data: categorySpending, isLoading: catLoading } = useSpendingByCategory(year, month);
  const { data: trend, isLoading: trendLoading } = useMonthlyTrend(6);

  function handleMonthChange(y: number, m: number) {
    setYear(y);
    setMonth(m);
  }

  // Prepare chart data
  const pieData = categorySpending.map((cs) => ({
    name: cs.category.name,
    value: parseFloat(cs.spent),
    color: cs.category.color,
  }));

  const barData = categorySpending.map((cs) => ({
    name: cs.category.name,
    spent: parseFloat(cs.spent),
    budget: cs.budgetLimit ? parseFloat(cs.budgetLimit) : 0,
    color: cs.category.color,
  }));

  const trendData = trend.map((t) => ({
    label: `${MONTHS[t.month - 1]} ${t.year}`,
    income: parseFloat(t.totalIncome),
    expenses: parseFloat(t.totalExpenses),
  }));

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold text-sm">Budget Tracker</Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/categories" className="hover:text-foreground transition-colors">Categories</Link>
              <Link to="/transactions" className="hover:text-foreground transition-colors">Transactions</Link>
              <Link to="/budgets" className="hover:text-foreground transition-colors">Budgets</Link>
              <Link to="/recurring-rules" className="hover:text-foreground transition-colors">Recurring</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <CurrencySelector />
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <MonthSelector year={year} month={month} onChange={handleMonthChange} />
        </div>

        {/* Monthly summary cards */}
        {summaryLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading summary...</p>
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Income</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {formatAmount(summary.totalIncome, userCurrency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Expenses</p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {formatAmount(summary.totalExpenses, userCurrency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Balance</p>
                <p className={`text-2xl font-bold mt-1 ${parseFloat(summary.netBalance) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatAmount(summary.netBalance, userCurrency)}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Spending by category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Donut chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {catLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
              ) : pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No expenses this month</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatAmount(value.toFixed(2), userCurrency)}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Budget vs Spent bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Budget vs Spent</CardTitle>
            </CardHeader>
            <CardContent>
              {catLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
              ) : barData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No expenses this month</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={60} />
                    <Tooltip
                      formatter={(value: number) => formatAmount(value.toFixed(2), userCurrency)}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="spent" fill="#ef4444" name="Spent" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="budget" fill="#3b82f6" name="Budget" radius={[0, 4, 4, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly trend line chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : trendData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => formatAmount(value.toFixed(2), userCurrency)}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} name="Income" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
