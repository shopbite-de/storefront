import { invalidValue } from "./errors";

/** ISO 4217 code, e.g. `EUR`. */
export type CurrencyCode = string;

/**
 * An amount of money in minor units (cents), so sums never drift. Negative
 * amounts are discounts. Created only by `money()`/`moneyFromDecimal()`.
 */
export type Money = Readonly<{
  amountMinor: number;
  currency: CurrencyCode;
}>;

const CURRENCY = /^[A-Z]{3}$/;

export function money(amountMinor: number, currency: CurrencyCode): Money {
  if (!Number.isFinite(amountMinor) || !Number.isInteger(amountMinor)) {
    throw invalidValue(
      "Money is a whole number of minor units (cents).",
      amountMinor,
    );
  }
  if (!CURRENCY.test(currency)) {
    throw invalidValue("Money needs an ISO 4217 currency code.", currency);
  }
  return Object.freeze({ amountMinor, currency });
}

/** From a decimal amount as most backends send it (`10.5` → 1050 cents). */
export function moneyFromDecimal(
  amount: number,
  currency: CurrencyCode,
): Money {
  if (!Number.isFinite(amount)) {
    throw invalidValue("Money needs a finite amount.", amount);
  }
  return money(Math.round(amount * 100), currency);
}

/** The decimal amount, e.g. for a backend that expects `10.5`. */
export function toDecimal(value: Money): number {
  return value.amountMinor / 100;
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
