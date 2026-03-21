import { describe, it, expect } from "vitest";
import { createTransactionSchema, updateTransactionSchema, listTransactionsSchema } from "../../src/validators/transactions";

const validCreate = {
  amount: "100.00",
  type: "EXPENSE",
  categoryId: "00000000-0000-0000-0000-000000000001",
  description: "Weekly groceries",
  date: "2026-03-01",
};

describe("createTransactionSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = createTransactionSchema.safeParse({ ...validCreate, notes: "Some note" });
    expect(result.success).toBe(true);
  });

  it("accepts valid input without optional notes", () => {
    const result = createTransactionSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it("rejects missing amount", () => {
    const { amount: _, ...rest } = validCreate;
    expect(createTransactionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects amount without 2 decimal places", () => {
    expect(createTransactionSchema.safeParse({ ...validCreate, amount: "100" }).success).toBe(false);
    expect(createTransactionSchema.safeParse({ ...validCreate, amount: "100.1" }).success).toBe(false);
    expect(createTransactionSchema.safeParse({ ...validCreate, amount: "100.123" }).success).toBe(false);
  });

  it("accepts amount with exactly 2 decimal places", () => {
    expect(createTransactionSchema.safeParse({ ...validCreate, amount: "0.01" }).success).toBe(true);
    expect(createTransactionSchema.safeParse({ ...validCreate, amount: "9999999999.99" }).success).toBe(true);
  });

  it("rejects invalid type", () => {
    expect(createTransactionSchema.safeParse({ ...validCreate, type: "BOTH" }).success).toBe(false);
  });

  it("rejects non-UUID categoryId", () => {
    expect(createTransactionSchema.safeParse({ ...validCreate, categoryId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects missing description", () => {
    const { description: _, ...rest } = validCreate;
    expect(createTransactionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid date format", () => {
    expect(createTransactionSchema.safeParse({ ...validCreate, date: "01/03/2026" }).success).toBe(false);
    expect(createTransactionSchema.safeParse({ ...validCreate, date: "2026-3-1" }).success).toBe(false);
  });
});

describe("updateTransactionSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(updateTransactionSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update", () => {
    expect(updateTransactionSchema.safeParse({ description: "Updated" }).success).toBe(true);
  });

  it("accepts notes set to null (to clear)", () => {
    expect(updateTransactionSchema.safeParse({ notes: null }).success).toBe(true);
  });

  it("still rejects invalid amount format", () => {
    expect(updateTransactionSchema.safeParse({ amount: "bad" }).success).toBe(false);
  });
});

describe("listTransactionsSchema", () => {
  it("accepts empty query (uses defaults)", () => {
    const result = listTransactionsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("coerces string page and limit to numbers", () => {
    const result = listTransactionsSchema.safeParse({ page: "2", limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it("rejects limit over 100", () => {
    expect(listTransactionsSchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("rejects invalid date format for from/to", () => {
    expect(listTransactionsSchema.safeParse({ from: "01/03/2026" }).success).toBe(false);
  });

  it("accepts valid filters", () => {
    const result = listTransactionsSchema.safeParse({
      from: "2026-03-01",
      to: "2026-03-31",
      type: "EXPENSE",
      categoryId: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(true);
  });
});
