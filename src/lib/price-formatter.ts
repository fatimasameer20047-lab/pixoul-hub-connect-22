// Exchange rate configuration - easy to update
const USD_PER_AED = 0.27;

/**
 * Formats price in AED with USD conversion
 * @param aedAmount - Price in AED
 * @returns Formatted string like "AED 220 (USD 59)"
 */
export function formatPriceAEDUSD(aedAmount: number): string {
  const usdAmount = Math.round(aedAmount * USD_PER_AED);
  return `AED ${aedAmount} (USD ${usdAmount})`;
}