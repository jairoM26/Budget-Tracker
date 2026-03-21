import { describe, it, expect } from "vitest";
import { createCategorySchema, updateCategorySchema } from "../../src/validators/categories";

describe("createCategorySchema", () => {
  it("accepts valid input with all fields", () => {
    const result = createCategorySchema.safeParse({
      name: "Food",
      color: "#f97316",
      icon: "utensils",
      type: "EXPENSE",
    });
    expect(result.success).toBe(true);
  });

  it("accepts name-only input (other fields optional)", () => {
    const result = createCategorySchema.safeParse({ name: "Misc" });
    expect(result.success).toBe(true);
  });

  it("accepts null type", () => {
    const result = createCategorySchema.safeParse({ name: "General", type: null });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createCategorySchema.safeParse({ color: "#f97316" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createCategorySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 50 characters", () => {
    const result = createCategorySchema.safeParse({ name: "a".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex color (named color)", () => {
    const result = createCategorySchema.safeParse({ name: "Food", color: "red" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex color (3-digit shorthand)", () => {
    const result = createCategorySchema.safeParse({ name: "Food", color: "#f97" });
    expect(result.success).toBe(false);
  });

  it("accepts valid 6-digit hex color", () => {
    const result = createCategorySchema.safeParse({ name: "Food", color: "#FF0000" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type value", () => {
    const result = createCategorySchema.safeParse({ name: "Food", type: "BOTH" });
    expect(result.success).toBe(false);
  });
});

describe("updateCategorySchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateCategorySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update", () => {
    const result = updateCategorySchema.safeParse({ name: "NewName" });
    expect(result.success).toBe(true);
  });

  it("still rejects invalid color", () => {
    const result = updateCategorySchema.safeParse({ color: "not-a-color" });
    expect(result.success).toBe(false);
  });
});
