/**
 * Formats price in AED
 * @param aedAmount - Price in AED
 * @returns Formatted string like "AED 25"
 */
export function formatPriceAED(aedAmount: number): string {
  const amount = Number.isFinite(aedAmount) ? aedAmount : 0;
  const formatted = Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
  return `AED ${formatted}`;
}
