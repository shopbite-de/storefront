import type { Money } from "../../shared/domain";

/**
 * App-side arithmetic on the domain's Money (minor units with a
 * currency). The app cannot import the domain's value objects (Layer
 * imports), so the few operations the UI needs live here.
 */

const digits = new Map<string, number>();

/** Digits of the minor unit (EUR 2, JPY 0, KWD 3). */
function minorDigits(currency: string): number {
  let value = digits.get(currency);
  if (value === undefined) {
    value =
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2;
    digits.set(currency, value);
  }
  return value;
}

/** The decimal amount, for formatting and tracking (`1050` EUR → 10.5). */
export function moneyAmount(value: Money): number {
  return value.amountMinor / 10 ** minorDigits(value.currency);
}

/** The sum of prices in one currency, times a quantity. */
export function sumMoney(
  values: readonly Money[],
  currency: string,
  quantity = 1,
): Money {
  return {
    amountMinor:
      values.reduce((sum, value) => sum + value.amountMinor, 0) * quantity,
    currency,
  };
}
