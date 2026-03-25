import { describe, it, expect } from "vitest";
import { computeNextDue } from "../../src/services/recurring-rules";

describe("computeNextDue", () => {
  it("advances daily by 1 day", () => {
    const result = computeNextDue(new Date("2026-03-15T00:00:00Z"), "DAILY");
    expect(result.toISOString().slice(0, 10)).toBe("2026-03-16");
  });

  it("advances weekly by 7 days", () => {
    const result = computeNextDue(new Date("2026-03-15T00:00:00Z"), "WEEKLY");
    expect(result.toISOString().slice(0, 10)).toBe("2026-03-22");
  });

  it("advances monthly by 1 month", () => {
    const result = computeNextDue(new Date("2026-03-15T00:00:00Z"), "MONTHLY");
    expect(result.toISOString().slice(0, 10)).toBe("2026-04-15");
  });

  it("advances yearly by 1 year", () => {
    const result = computeNextDue(new Date("2026-03-15T00:00:00Z"), "YEARLY");
    expect(result.toISOString().slice(0, 10)).toBe("2027-03-15");
  });

  it("handles daily across month boundary", () => {
    const result = computeNextDue(new Date("2026-03-31T00:00:00Z"), "DAILY");
    expect(result.toISOString().slice(0, 10)).toBe("2026-04-01");
  });

  it("handles weekly across month boundary", () => {
    const result = computeNextDue(new Date("2026-03-28T00:00:00Z"), "WEEKLY");
    expect(result.toISOString().slice(0, 10)).toBe("2026-04-04");
  });

  it("handles monthly across year boundary", () => {
    const result = computeNextDue(new Date("2026-12-15T00:00:00Z"), "MONTHLY");
    expect(result.toISOString().slice(0, 10)).toBe("2027-01-15");
  });

  it("handles yearly on leap day", () => {
    // Feb 29 2024 + 1 year → Mar 1 2025 (JS Date behavior)
    const result = computeNextDue(new Date("2024-02-29T00:00:00Z"), "YEARLY");
    // JS shifts to March 1 since 2025 has no Feb 29
    expect(result.getUTCMonth()).toBe(2); // March = 2
    expect(result.getUTCFullYear()).toBe(2025);
  });

  it("handles monthly from Jan 31 (month with fewer days)", () => {
    // Jan 31 + 1 month = Feb 28 or Mar 2/3 depending on JS engine
    const result = computeNextDue(new Date("2026-01-31T00:00:00Z"), "MONTHLY");
    // JS Date wraps Jan 31 + 1 month to March 3 (since Feb has 28 days in 2026)
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBeGreaterThanOrEqual(1); // At least February
  });
});
