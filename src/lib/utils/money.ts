const currencyFormatters = new Map<string, Intl.NumberFormat>();

// Medusa money fields aren't guaranteed to arrive as a plain JS number (a
// BigNumber-ish value, or simply missing while an order's totals are still
// being computed) - format that as 0 rather than "GH₵NaN".
export function toAmount(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatMoney(amount: unknown, currency = "GHS") {
  const key = `${currency}:0`;
  let formatter = currencyFormatters.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    });
    currencyFormatters.set(key, formatter);
  }

  return formatter.format(toAmount(amount));
}
