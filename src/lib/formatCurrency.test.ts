import { formatCurrency } from "./formatCurrency";

describe("formatCurrency", () => {
  it("formats positive numbers as USD currency", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00");
    expect(formatCurrency(1500.5)).toBe("$1,500.50");
    expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
  });

  it("handles zero correctly", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("handles null and undefined values", () => {
    expect(formatCurrency(null)).toBe("");
    expect(formatCurrency(undefined)).toBe("");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(1000.555)).toBe("$1,000.56");
    expect(formatCurrency(1000.554)).toBe("$1,000.55");
  });
});
