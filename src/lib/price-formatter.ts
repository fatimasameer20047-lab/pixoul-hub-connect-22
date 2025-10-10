/**
 * Formats price in AED
 * @param aedAmount - Price in AED
 * @returns Formatted string like "AED 25"
 */
export function formatPriceAEDUSD(aedAmount: number): string {
  return `AED ${aedAmount.toFixed(0)}`;
}