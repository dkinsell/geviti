/**
 * Formats a number as a US dollar currency string.
 * Example: 150000 -> $150,000.00
 * @param amount - The numeric amount to format.
 * @returns The formatted currency string.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return "";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
