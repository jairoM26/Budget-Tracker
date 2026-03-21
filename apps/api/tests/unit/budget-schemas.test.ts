import { describe, it, expect } from "vitest";
import { createBudgetSchema, updateBudgetSchema, listBudgetsSchema } from "../../src/validators/budgets";

const validCategory = { categoryId: "00000000-0000-0000-0000-000000000001", limitAmount: "400.00" };

const validCreate = {
  year: 2026,
  month: 3,
  totalLimit: "3000.00",
  categories: [validCategory],
};

describe("createBudgetSchema", () => {
  it("accepts valid input with categories", () => {
    expect(createBudgetSchema.safeParse(validCreate).success).toBe(true);
  });

  it("accepts valid input without categories (defaults to [])", () => {
    const { categories: _, ...rest } = validCreate;
    const result = createBudgetSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.categories).toEqual([]);
  });

  it("rejects missing year", () => {
    const { year: _, ...rest } = validCreate;
    expect(createBudgetSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing month", () => {
    const { month: _, ...rest } = validCreate;
    expect(createBudgetSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects month out of range", () => {
    expect(createBudgetSchema.safeParse({ ...validCreate, month: 0 }).success).toBe(false);
    expect(createBudgetSchema.safeParse({ ...validCreate, month: 13 }).success).toBe(false);
  });

  it("rejects year out of range", () => {
    expect(createBudgetSchema.safeParse({ ...validCreate, year: 1999 }).success).toBe(false);
    expect(createBudgetSchema.safeParse({ ...validCreate, year: 2101 }).success).toBe(false);
  });

  it("rejects invalid totalLimit format", () => {
    expect(createBudgetSchema.safeParse({ ...validCreate, totalLimit: "3000" }).success).toBe(false);
    expect(createBudgetSchema.safeParse({ ...validCreate, totalLimit: "3000.5" }).success).toBe(false);
  });

  it("rejects category with invalid limitAmount", () => {
    const badCategory = { categoryId: "00000000-0000-0000-0000-000000000001", limitAmount: "400" };
    expect(createBudgetSchema.safeParse({ ...validCreate, categories: [badCategory] }).success).toBe(false);
  });

  it("rejects category with non-UUID categoryId", () => {
    const badCategory = { categoryId: "not-a-uuid", limitAmount: "400.00" };
    expect(createBudgetSchema.safeParse({ ...validCreate, categories: [badCategory] }).success).toBe(false);
  });
});

describe("updateBudgetSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(updateBudgetSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with just totalLimit", () => {
    expect(updateBudgetSchema.safeParse({ totalLimit: "4000.00" }).success).toBe(true);
  });

  it("accepts partial update with categories only", () => {
    expect(updateBudgetSchema.safeParse({ categories: [validCategory] }).success).toBe(true);
  });

  it("rejects invalid totalLimit format", () => {
    expect(updateBudgetSchema.safeParse({ totalLimit: "4000" }).success).toBe(false);
  });
});

describe("listBudgetsSchema", () => {
  it("accepts empty query (no filters)", () => {
    expect(listBudgetsSchema.safeParse({}).success).toBe(true);
  });

  it("coerces string year and month to numbers", () => {
    const result = listBudgetsSchema.safeParse({ year: "2026", month: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBe(2026);
      expect(result.data.month).toBe(3);
    }
  });

  it("rejects invalid month", () => {
    expect(listBudgetsSchema.safeParse({ month: "13" }).success).toBe(false);
    expect(listBudgetsSchema.safeParse({ month: "0" }).success).toBe(false);
  });
});
