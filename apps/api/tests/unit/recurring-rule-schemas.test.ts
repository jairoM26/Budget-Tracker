import { describe, it, expect } from "vitest";
import { createRecurringRuleSchema, updateRecurringRuleSchema } from "../../src/validators/recurring-rules";

describe("createRecurringRuleSchema", () => {
  const valid = {
    amount: "1200.00",
    type: "EXPENSE",
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
    description: "Monthly rent",
    frequency: "MONTHLY",
    startDate: "2026-04-01",
  };

  it("accepts valid input", () => {
    expect(createRecurringRuleSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts valid input with endDate", () => {
    const result = createRecurringRuleSchema.safeParse({ ...valid, endDate: "2027-04-01" });
    expect(result.success).toBe(true);
  });

  it("accepts null endDate", () => {
    const result = createRecurringRuleSchema.safeParse({ ...valid, endDate: null });
    expect(result.success).toBe(true);
  });

  it("accepts all frequency values", () => {
    for (const frequency of ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]) {
      expect(createRecurringRuleSchema.safeParse({ ...valid, frequency }).success).toBe(true);
    }
  });

  it("accepts INCOME type", () => {
    expect(createRecurringRuleSchema.safeParse({ ...valid, type: "INCOME" }).success).toBe(true);
  });

  it("rejects missing amount", () => {
    const { amount: _, ...rest } = valid;
    expect(createRecurringRuleSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid amount format", () => {
    expect(createRecurringRuleSchema.safeParse({ ...valid, amount: "1200" }).success).toBe(false);
  });

  it("rejects missing description", () => {
    const { description: _, ...rest } = valid;
    expect(createRecurringRuleSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid frequency", () => {
    expect(createRecurringRuleSchema.safeParse({ ...valid, frequency: "BIWEEKLY" }).success).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(createRecurringRuleSchema.safeParse({ ...valid, type: "TRANSFER" }).success).toBe(false);
  });

  it("rejects invalid startDate format", () => {
    expect(createRecurringRuleSchema.safeParse({ ...valid, startDate: "04-01-2026" }).success).toBe(false);
  });

  it("rejects invalid categoryId", () => {
    expect(createRecurringRuleSchema.safeParse({ ...valid, categoryId: "not-uuid" }).success).toBe(false);
  });
});

describe("updateRecurringRuleSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(updateRecurringRuleSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with amount", () => {
    expect(updateRecurringRuleSchema.safeParse({ amount: "1300.00" }).success).toBe(true);
  });

  it("accepts active toggle", () => {
    expect(updateRecurringRuleSchema.safeParse({ active: false }).success).toBe(true);
  });

  it("accepts nextDue update", () => {
    expect(updateRecurringRuleSchema.safeParse({ nextDue: "2026-05-01" }).success).toBe(true);
  });

  it("accepts null endDate", () => {
    expect(updateRecurringRuleSchema.safeParse({ endDate: null }).success).toBe(true);
  });

  it("rejects invalid amount", () => {
    expect(updateRecurringRuleSchema.safeParse({ amount: "abc" }).success).toBe(false);
  });
});
