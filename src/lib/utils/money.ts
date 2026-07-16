const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency = "GHS") {
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

  return formatter.format(amount);
}
