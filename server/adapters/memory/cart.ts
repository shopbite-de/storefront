import { v5 as uuidv5 } from "uuid";
import {
  addMoney,
  deepFreeze,
  dishConfiguration,
  DomainError,
  isSameDishConfiguration,
  money,
  multiplyMoney,
  sumMoney,
  type Cart,
  type CartLine,
  type CartMessage,
  type CheckoutSelection,
  type DishConfiguration,
  type Id,
  type Money,
} from "../../../shared/domain";
import type { BackendSession, CartPort } from "../../ports";
import { MAX_LINE_QUANTITY } from "../../ports/CartPort";
import type { MemoryCatalog, MemoryDish } from "./catalog";

/** A voucher of the memory restaurant: a fixed discount (negative). */
export type MemoryVoucher = Readonly<{
  code: string;
  name: string;
  amount: Money;
}>;

type StoredLine = {
  id: Id;
  configuration: DishConfiguration;
  quantity: number;
};
type StoredCart = { lines: StoredLine[]; vouchers: string[] };

const LINE_NAMESPACE = "6f1c3a52-7d0e-4c1b-9a8e-2b5d4f6a7c80";

/** One id per configuration, whatever the order of its parts. */
function lineId(configuration: DishConfiguration): Id {
  return uuidv5(
    [
      configuration.dishId,
      configuration.variantId ?? "",
      [...configuration.extraIds].sort().join(","),
      [...configuration.removedIngredientIds].sort().join(","),
    ].join("|"),
    LINE_NAMESPACE,
  );
}

const invalid = (message: string, value: unknown) =>
  new DomainError("invalid_value", message, { value });

function checkQuantity(quantity: number, least: number): void {
  if (
    !Number.isInteger(quantity) ||
    quantity < least ||
    quantity > MAX_LINE_QUANTITY
  ) {
    throw invalid(
      `A quantity is a whole number from ${least} to ${MAX_LINE_QUANTITY}.`,
      quantity,
    );
  }
}

/**
 * CartPort in memory (ADR 0001): one cart per session state, priced from
 * the memory menu. The state is a random cart token; at most `maxCarts`
 * carts are kept (the oldest is dropped). Shipping is free, no taxes.
 */
/**
 * The memory cart with what the memory checkout needs of it: the cart of a
 * session token as the port answers it, and emptying it after an order.
 */
export type MemoryCart = CartPort &
  Readonly<{
    cartOf(token: string): Cart;
    clear(token: string): void;
    /**
     * The carts of `from` (in their order) as one cart of `to`: the lines
     * of the same configuration add up, as Shopware merges the visitor's
     * cart into the customer's on login. The carts of `from` are gone.
     * A key need not be a session token (a customer's saved cart).
     */
    merge(from: readonly (string | undefined)[], to: string): void;
  }>;

export function createMemoryCart(
  catalog: MemoryCatalog,
  vouchers: readonly MemoryVoucher[],
  options: {
    maxCarts?: number;
    /** The checkout's methods of a session token (none without). */
    selectionOf?: (token: string) => CheckoutSelection;
  } = {},
): MemoryCart {
  const maxCarts = options.maxCarts ?? 10_000;
  const carts = new Map<string, StoredCart>();
  const dishes = new Map(catalog.dishes.map((dish) => [dish.id, dish]));
  const currency =
    catalog.dishes[0]?.price.currency ?? vouchers[0]?.amount.currency ?? "EUR";

  /** The session token of a stored cart, for its selected methods. */
  const tokens = new WeakMap<StoredCart, string>();

  async function cartOf(
    session: BackendSession,
    create: boolean,
  ): Promise<StoredCart | null> {
    const token = await session.read();
    const existing = token ? carts.get(token) : undefined;
    if (existing) {
      // most recently used last
      carts.delete(token!);
      carts.set(token!, existing);
      return existing;
    }
    if (!create) return null;
    const fresh: StoredCart = { lines: [], vouchers: [] };
    const next = token ?? crypto.randomUUID();
    carts.set(next, fresh);
    tokens.set(fresh, next);
    while (carts.size > maxCarts) {
      carts.delete(carts.keys().next().value!);
    }
    if (next !== token) await session.write(next);
    return fresh;
  }

  /**
   * A variant may be named as the dish (the upsell lists variants as
   * dishes): it is that variant of its dish.
   */
  function canonical(configuration: DishConfiguration): DishConfiguration {
    if (configuration.variantId || dishes.has(configuration.dishId)) {
      return configuration;
    }
    const owner = catalog.dishes.find((dish) =>
      dish.variants.some((variant) => variant.id === configuration.dishId),
    );
    return owner
      ? dishConfiguration({
          ...configuration,
          dishId: owner.id,
          variantId: configuration.dishId,
        })
      : configuration;
  }

  function resolve(configuration: DishConfiguration) {
    const dish = dishes.get(configuration.dishId);
    const unavailable = () =>
      new DomainError(
        "dish_unavailable",
        "The menu does not offer this dish.",
        {
          dishId: configuration.dishId,
        },
      );
    if (!dish || !dish.available) throw unavailable();
    const variant = configuration.variantId
      ? dish.variants.find((entry) => entry.id === configuration.variantId)
      : undefined;
    if (configuration.variantId && !variant) {
      throw invalid("The dish has no such variant.", configuration.variantId);
    }
    if (!variant && dish.variants.length > 0) throw unavailable();
    if (variant && !variant.available) throw unavailable();
    const offered = dish.extraGroups.flatMap((group) => group.extras);
    const extras = configuration.extraIds.map((id) => {
      const extra = offered.find((entry) => entry.id === id);
      if (!extra) throw invalid("The dish has no such extra.", id);
      return extra;
    });
    const ingredients = variant?.ingredients ?? dish.ingredients;
    const removed = configuration.removedIngredientIds.map((id) => {
      const ingredient = ingredients.find((entry) => entry.id === id);
      if (!ingredient) {
        throw invalid("The dish has no such main ingredient.", id);
      }
      return ingredient;
    });
    return { dish, variant, extras, removed };
  }

  function variantChoice(dish: MemoryDish, optionIds: readonly Id[]) {
    return dish.variantGroups.flatMap((group) => {
      const option = group.options.find((entry) =>
        optionIds.includes(entry.id),
      );
      return option ? [{ group: group.name, option: option.name }] : [];
    });
  }

  function toLine(stored: StoredLine): CartLine {
    const { dish, variant, extras, removed } = resolve(stored.configuration);
    const unitPrice = extras.reduce(
      (sum, extra) => addMoney(sum, extra.price),
      variant?.price ?? dish.price,
    );
    return {
      id: stored.id,
      configuration: stored.configuration,
      dishNumber: variant?.number ?? dish.number,
      name: variant?.name ?? dish.name,
      variant: variant ? variantChoice(dish, variant.optionIds) : [],
      extras: extras.map((extra) => ({
        id: extra.id,
        name: extra.name,
        unitPrice: extra.price,
      })),
      removedIngredients: removed.map((ingredient) => ingredient.name),
      quantity: stored.quantity,
      unitPrice,
      totalPrice: multiplyMoney(unitPrice, stored.quantity),
      media: variant?.media ?? dish.media,
    };
  }

  function answer(
    stored: StoredCart | null,
    messages: readonly CartMessage[] = [],
  ): Cart {
    const lines = (stored?.lines ?? []).map(toLine);
    const discounts = (stored?.vouchers ?? []).flatMap((code) => {
      const voucher = vouchers.find((entry) => entry.code === code);
      return voucher
        ? [{ code: voucher.code, name: voucher.name, amount: voucher.amount }]
        : [];
    });
    const subtotal = sumMoney(
      [
        ...lines.map((line) => line.totalPrice),
        ...discounts.map((discount) => discount.amount),
      ],
      currency,
    );
    // like a backend that prices shipping per order: an empty cart has
    // no methods yet
    const token = stored ? tokens.get(stored) : undefined;
    const selection =
      token && lines.length ? options.selectionOf?.(token) : undefined;
    return deepFreeze({
      lines,
      discounts,
      subtotal,
      shippingCosts: money(0, currency),
      total: subtotal,
      taxes: [],
      shippingMethodId: selection?.shippingMethodId ?? null,
      paymentMethodId: selection?.paymentMethodId ?? null,
      messages: [...messages],
    });
  }

  function lineOf(stored: StoredCart | null, id: Id): StoredLine {
    const line = stored?.lines.find((entry) => entry.id === id);
    if (!line) {
      throw new DomainError("not_found", "The cart holds no such line.", {
        lineId: id,
      });
    }
    return line;
  }

  return {
    cartOf: (token) => answer(carts.get(token) ?? null),
    clear: (token) => {
      const stored = carts.get(token);
      if (stored) {
        stored.lines = [];
        stored.vouchers = [];
      }
    },

    merge: (from, to) => {
      const merged: StoredCart = { lines: [], vouchers: [] };
      for (const key of from) {
        const stored = key ? carts.get(key) : undefined;
        if (!stored) continue;
        carts.delete(key!);
        for (const line of stored.lines) {
          const existing = merged.lines.find((entry) =>
            isSameDishConfiguration(entry.configuration, line.configuration),
          );
          if (existing) {
            existing.quantity = Math.min(
              existing.quantity + line.quantity,
              MAX_LINE_QUANTITY,
            );
          } else merged.lines.push({ ...line });
        }
        for (const code of stored.vouchers) {
          if (!merged.vouchers.includes(code)) merged.vouchers.push(code);
        }
      }
      carts.delete(to);
      if (!merged.lines.length && !merged.vouchers.length) return;
      carts.set(to, merged);
      tokens.set(merged, to);
      while (carts.size > maxCarts) {
        carts.delete(carts.keys().next().value!);
      }
    },

    getCart: async (session) => answer(await cartOf(session, false)),

    addLine: async (session, given, quantity) => {
      checkQuantity(quantity, 1);
      const configuration = canonical(given);
      resolve(configuration);
      const stored = (await cartOf(session, true))!;
      const existing = stored.lines.find((line) =>
        isSameDishConfiguration(line.configuration, configuration),
      );
      if (existing) existing.quantity += quantity;
      else {
        stored.lines.push({
          id: lineId(configuration),
          configuration,
          quantity,
        });
      }
      return answer(stored);
    },

    changeQuantity: async (session, id, quantity) => {
      checkQuantity(quantity, 0);
      const stored = await cartOf(session, false);
      const line = lineOf(stored, id);
      if (quantity === 0) stored!.lines.splice(stored!.lines.indexOf(line), 1);
      else line.quantity = quantity;
      return answer(stored);
    },

    removeLine: async (session, id) => {
      const stored = await cartOf(session, false);
      stored!.lines.splice(stored!.lines.indexOf(lineOf(stored, id)), 1);
      return answer(stored);
    },

    applyVoucher: async (session, code) => {
      const voucher = vouchers.find((entry) => entry.code === code.trim());
      const stored = (await cartOf(session, true))!;
      if (!voucher) {
        return answer(stored, [
          {
            code: "voucher_invalid",
            severity: "error",
            text: `Gutscheincode "${code.trim()}" existiert nicht.`,
            subjectId: code.trim(),
          },
        ]);
      }
      if (!stored.vouchers.includes(voucher.code)) {
        stored.vouchers.push(voucher.code);
      }
      return answer(stored);
    },

    removeVoucher: async (session, code) => {
      const stored = await cartOf(session, false);
      if (stored)
        stored.vouchers = stored.vouchers.filter((entry) => entry !== code);
      return answer(stored);
    },
  };
}
