import { describe, expect, it } from "vitest";
import {
  addMoney,
  isDomainError,
  money,
  moneyFromDecimal,
  multiplyMoney,
  sumMoney,
  toDecimal,
} from "../../../shared/domain";

describe("Money", () => {
  it("keeps the amount in minor units with an ISO 4217 currency", () => {
    expect(money(1050, "EUR")).toEqual({ amountMinor: 1050, currency: "EUR" });
  });

  it("is immutable", () => {
    const price = money(700, "EUR");
    expect(Object.isFrozen(price)).toBe(true);
  });

  it("rejects fractions of a minor unit and non-finite amounts", () => {
    expect(() => money(10.5, "EUR")).toThrowError(/minor units/);
    expect(() => money(Number.NaN, "EUR")).toThrowError();
    expect(() => money(Number.POSITIVE_INFINITY, "EUR")).toThrowError();
  });

  it("rejects currencies that are not three upper-case letters", () => {
    for (const currency of ["eur", "EURO", "", "€"]) {
      try {
        money(100, currency);
        expect.unreachable(currency);
      } catch (error) {
        expect(isDomainError(error, "invalid_value")).toBe(true);
      }
    }
  });

  it("allows negative amounts (discounts, vouchers)", () => {
    expect(money(-200, "EUR").amountMinor).toBe(-200);
  });

  it("converts from and to a decimal amount without float drift", () => {
    expect(moneyFromDecimal(10.5, "EUR").amountMinor).toBe(1050);
    expect(moneyFromDecimal(0.1 + 0.2, "EUR").amountMinor).toBe(30);
    expect(moneyFromDecimal(19.99, "EUR").amountMinor).toBe(1999);
    expect(toDecimal(money(1999, "EUR"))).toBe(19.99);
  });

  it("adds and multiplies amounts of the same currency", () => {
    const pizza = money(800, "EUR");
    const extra = money(150, "EUR");
    expect(addMoney(pizza, extra)).toEqual(money(950, "EUR"));
    expect(multiplyMoney(pizza, 3)).toEqual(money(2400, "EUR"));
    expect(sumMoney([pizza, extra, extra], "EUR")).toEqual(money(1100, "EUR"));
    expect(sumMoney([], "EUR")).toEqual(money(0, "EUR"));
  });

  it("refuses to mix currencies", () => {
    expect(() => addMoney(money(1, "EUR"), money(1, "CHF"))).toThrowError(
      /currency/,
    );
  });

  it("multiplies by whole quantities only", () => {
    expect(() => multiplyMoney(money(100, "EUR"), 1.5)).toThrowError();
  });
});
