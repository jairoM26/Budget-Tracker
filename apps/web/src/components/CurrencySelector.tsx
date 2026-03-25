import { useAuth } from "../contexts/AuthContext";
import { CURRENCIES, type Currency } from "../lib/currency";

export function CurrencySelector() {
  const { user, updateProfile } = useAuth();

  async function handleChange(newCurrency: Currency) {
    await updateProfile({ currency: newCurrency });
  }

  return (
    <select
      value={user?.currency ?? "USD"}
      onChange={(e) => handleChange(e.target.value as Currency)}
      className="h-7 rounded-md border border-input bg-input px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      title="Currency"
    >
      {CURRENCIES.map((c) => (
        <option key={c.value} value={c.value}>
          {c.symbol} {c.value}
        </option>
      ))}
    </select>
  );
}
