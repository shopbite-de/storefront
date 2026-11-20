import { invalidValue } from "./errors";

/** ISO 4217 code, e.g. `EUR`. */
export type CurrencyCode = string;

/**
 * An amount of money in minor units of its currency (cents for EUR, yen
 * for JPY, fils for KWD), so sums never drift. Negative amounts are
 * discounts. Created only by `money()`/`moneyFromDecimal()`.
 */
export type Money = Readonly<{
  amountMinor: number;
  currency: CurrencyCode;
}>;

const CURRENCY = /^[A-Z]{3}$/;

/**
 * Digits of the minor unit of a currency (EUR 2, JPY 0, KWD 3), from the
 * platform's ISO 4217 data.
 */
export function currencyExponent(currency: CurrencyCode): number {
  if (!CURRENCY.test(currency)) {
    throw invalidValue("Money needs an ISO 4217 currency code.", currency);
  }
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

export function money(amountMinor: number, currency: CurrencyCode): Money {
  if (!Number.isFinite(amountMinor) || !Number.isInteger(amountMinor)) {
    throw invalidValue(
      "Money is a whole number of minor units (cents).",
      amountMinor,
    );
  }
  currencyExponent(currency);
  // no negative zero: -0 and 0 must compare and serialise alike
  return Object.freeze({ amountMinor: amountMinor || 0, currency });
}

/**
 * `amount` × 10^`exponent` without binary float error: `1.005` is shifted
 * as the decimal it was written as (`1.005e2` = 100.5), not as 1.00499….
 */
function shift(amount: number, exponent: number): number {
  const written = String(amount);
  return written.includes("e")
    ? amount * 10 ** exponent
    : Number(`${written}e${exponent}`);
}

/**
 * From a decimal amount as most backends send it (`10.5` EUR → 1050),
 * rounded half away from zero to the currency's minor unit.
 */
export function moneyFromDecimal(
  amount: number,
  currency: CurrencyCode,
): Money {
  if (!Number.isFinite(amount)) {
    throw invalidValue("Money needs a finite amount.", amount);
  }
  const minor = Math.round(shift(Math.abs(amount), currencyExponent(currency)));
  return money(Math.sign(amount) * minor, currency);
}

/** The decimal amount, e.g. for a backend that expects `10.5`. */
export function toDecimal(value: Money): number {
  return shift(value.amountMinor, -currencyExponent(value.currency));
}

function sameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw invalidValue("Money of different currency cannot be added.", [
      a.currency,
      b.currency,
    ]);
  }
}

export function addMoney(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

/** Price times a quantity (whole number). */
export function multiplyMoney(value: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) {
    throw invalidValue("Money is multiplied by whole quantities.", quantity);
  }
  return money(value.amountMinor * quantity, value.currency);
}

export function sumMoney(
  values: readonly Money[],
  currency: CurrencyCode,
): Money {
  return values.reduce(addMoney, money(0, currency));
}
