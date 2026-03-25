export type Currency = "USD" | "CRC";

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: "USD", label: "US Dollar ($)", symbol: "$" },
  { value: "CRC", label: "Colon (₡)", symbol: "₡" },
];

export function getCurrencySymbol(currency: Currency): string {
  return currency === "CRC" ? "₡" : "$";
}

export function formatAmount(amount: string, currency: Currency): string {
  const num = parseFloat(amount);
  if (currency === "CRC") {
    return `₡${num.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatSignedAmount(amount: string, type: "INCOME" | "EXPENSE", currency: Currency): string {
  const sign = type === "INCOME" ? "+" : "-";
  const num = parseFloat(amount);
  const symbol = getCurrencySymbol(currency);
  if (currency === "CRC") {
    return `${sign}${symbol}${num.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${sign}${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
