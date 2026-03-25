import { describe, it, expect } from "vitest";
import { monthlySummarySchema, spendingByCategorySchema, monthlyTrendSchema } from "../../src/validators/reports";

describe("monthlySummarySchema", () => {
  it("accepts valid year and month", () => {
    const result = monthlySummarySchema.safeParse({ year: "2026", month: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ year: 2026, month: 3 });
    }
  });

  it("coerces string values to numbers", () => {
    const result = monthlySummarySchema.safeParse({ year: "2026", month: "12" });
    expect(result.success).toBe(true);
  });

  it("rejects missing year", () => {
    const result = monthlySummarySchema.safeParse({ month: "3" });
    expect(result.success).toBe(false);
  });

  it("rejects missing month", () => {
    const result = monthlySummarySchema.safeParse({ year: "2026" });
    expect(result.success).toBe(false);
  });

  it("rejects month out of range", () => {
    expect(monthlySummarySchema.safeParse({ year: "2026", month: "0" }).success).toBe(false);
    expect(monthlySummarySchema.safeParse({ year: "2026", month: "13" }).success).toBe(false);
  });

  it("rejects year out of range", () => {
    expect(monthlySummarySchema.safeParse({ year: "1999", month: "1" }).success).toBe(false);
    expect(monthlySummarySchema.safeParse({ year: "2101", month: "1" }).success).toBe(false);
  });
});

describe("spendingByCategorySchema", () => {
  it("accepts valid year and month", () => {
    const result = spendingByCategorySchema.safeParse({ year: "2026", month: "6" });
    expect(result.success).toBe(true);
  });

  it("rejects missing params", () => {
    expect(spendingByCategorySchema.safeParse({}).success).toBe(false);
  });
});

describe("monthlyTrendSchema", () => {
  it("defaults months to 6", () => {
    const result = monthlyTrendSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.months).toBe(6);
    }
  });

  it("accepts custom months value", () => {
    const result = monthlyTrendSchema.safeParse({ months: "12" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.months).toBe(12);
    }
  });

  it("rejects months > 12", () => {
    expect(monthlyTrendSchema.safeParse({ months: "13" }).success).toBe(false);
  });

  it("rejects months < 1", () => {
    expect(monthlyTrendSchema.safeParse({ months: "0" }).success).toBe(false);
  });
});
