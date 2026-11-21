import { v4 as uuidv4, v5 as uuidv5 } from "uuid";
import {
  deepFreeze,
  dishConfiguration,
  DomainError,
  isPlainDish,
  moneyFromDecimal,
  orderedDishId,
  type Cart,
  type CartDiscount,
  type CartLine,
  type CartMessage,
  type CartMessageCode,
  type CurrencyCode,
  type DishConfiguration,
  type Id,
} from "../../../shared/domain";
import type { BackendSession, CartPort } from "../../ports";
import { MAX_LINE_QUANTITY } from "../../ports/CartPort";
import { toIngredients, toMedia, translated, type SwProduct } from "./catalog";
import { errorCodes, statusOf } from "./request";
import type { AdapterLog } from "./shop";
import type { StoreApi, VisitorStoreApi } from "./storeApi";

/*
 * The cart as the Store API and the ShopBite plugin keep it:
 *
 * - a dish without extras and removals is a `product` line item whose id is
 *   the product id (Shopware merges an equal one into it);
 * - a dish with extras or removed ingredients is a `container` line item
 *   (plugin `ContainerLineItemFactory`): the product as first child, the
 *   extras as further product children, the removed ingredients by name in
 *   `payload.without`. Its id is UUID v5 of the configuration, exactly as
 *   the storefront has computed it since 2.6.1, so lines already in a cart
 *   keep merging: product id + sorted extra ids, plus `|without:` and the
 *   sorted, lower-cased removals when there are any. Label and product
 *   number of the request are hints; the plugin (`DishLineItemCollector`)
 *   sets both from the products;
 * - vouchers are `promotion` line items.
 */
const CONTAINER_NAMESPACE = "b098ef7e-0fa2-4073-b002-7ceec4360fbf";
const PRODUCT = "product";
const CONTAINER = "container";
const PROMOTION = "promotion";

const CART_LOCKED_STATUS = 409;
const CART_LOCKED_CODE = "CHECKOUT__CART_LOCKED";
const LOCK_RETRY_DELAY_MS = 400;

type SwPrice = {
  unitPrice?: number;
  totalPrice?: number;
  calculatedTaxes?: { tax?: number; taxRate?: number }[] | null;
};
type SwLineItem = {
  id: string;
  type?: string;
  referencedId?: string | null;
  label?: string | null;
  quantity?: number;
  price?: SwPrice | null;
  payload?: {
    productNumber?: string;
    parentId?: string | null;
    options?: { group?: string; option?: string }[] | null;
    without?: unknown;
    code?: string;
  } | null;
  cover?: Parameters<typeof toMedia>[0];
  children?: SwLineItem[] | null;
};
type SwCartError = {
  messageKey?: string;
  key?: string;
  level?: number;
  message?: string;
  translatedMessage?: string;
  promotionCode?: string;
  id?: string;
  lineItemId?: string;
  parameters?: Record<string, unknown> | null;
};
export type SwCart = {
  /** The context token: never answered. */
  token?: string;
  lineItems?: SwLineItem[] | null;
  price?: {
    totalPrice?: number;
    positionPrice?: number;
    calculatedTaxes?: { tax?: number; taxRate?: number }[] | null;
  } | null;
  deliveries?:
    | {
        shippingCosts?: SwPrice | null;
        shippingMethod?: { id?: string } | null;
      }[]
    | null;
  transactions?: { paymentMethodId?: string | null }[] | null;
  errors?: Record<string, SwCartError> | SwCartError[] | null;
};

/** The seed of a container line's id (storefront 2.6.1). */
export function containerLineId(
  productId: Id,
  extraIds: readonly Id[],
  removedNames: readonly string[],
): string {
  const extrasSeed = [...extraIds].sort().join("");
  const withoutSeed = [
    ...new Set(removedNames.map((name) => name.toLocaleLowerCase("de"))),
  ]
    .sort()
    .join("|");
  const seed = withoutSeed
    ? `${productId}${extrasSeed}|without:${withoutSeed}`
    : `${productId}${extrasSeed}`;
  return uuidv5(seed, CONTAINER_NAMESPACE);
}

/** Cart messages by the backend's key; prefixes end with `-`. */
const MESSAGE_CODES: readonly [string, CartMessageCode][] = [
  ["product-not-found", "dish_unavailable"],
  ["product-out-of-stock", "dish_unavailable"],
  ["product-not-available", "dish_unavailable"],
  ["product-stock-reached", "quantity_adjusted"],
  ["min-order-quantity", "quantity_adjusted"],
  ["purchase-steps-quantity", "quantity_adjusted"],
  ["product-max-purchase", "quantity_adjusted"],
  ["shipping-method-blocked", "shipping_method_blocked"],
  ["payment-method-blocked", "payment_method_blocked"],
  ["shopbite-ordering-", "ordering_closed"],
  ["promotion-", "voucher_invalid"],
];

function messageCode(error: SwCartError): CartMessageCode {
  const key = error.messageKey ?? error.key ?? "";
  const found = MESSAGE_CODES.find(([prefix]) =>
    prefix.endsWith("-") ? key.startsWith(prefix) : key === prefix,
  )?.[1];
  // promotion notices ("discount added") are no invalid voucher
  if (found === "voucher_invalid" && (error.level ?? 0) < 10) return "other";
  return found ?? "other";
}

const SEVERITY = (level: number | undefined): CartMessage["severity"] =>
  (level ?? 0) >= 20 ? "error" : (level ?? 0) >= 10 ? "warning" : "info";

function toMessages(
  errors: SwCart["errors"],
  clean: (text: string) => string,
): CartMessage[] {
  return Object.values(errors ?? {}).map((error) => {
    const parameters = error.parameters ?? {};
    const subject =
      error.promotionCode ??
      (typeof parameters.code === "string" ? parameters.code : undefined) ??
      error.lineItemId ??
      (typeof parameters.id === "string" ? parameters.id : undefined) ??
      error.id ??
      null;
    return {
      code: messageCode(error),
      severity: SEVERITY(error.level),
      text: clean(error.translatedMessage ?? error.message ?? ""),
      subjectId: subject === null ? null : clean(subject),
    };
  });
}

const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

/** Product id → its main ingredients by name (`Hauptzutaten`). */
type IngredientIds = ReadonlyMap<Id, ReadonlyMap<string, Id>>;

function mainChild(line: SwLineItem): SwLineItem | undefined {
  const children = (line.children ?? []).filter(
    (child) => (child.type ?? PRODUCT) === PRODUCT,
  );
  // carts from before the plugin set the referenced id: the first child
  return (
    children.find((child) => child.referencedId === line.referencedId) ??
    children[0]
  );
}

function toLine(
  line: SwLineItem,
  money: (amount: number | undefined) => ReturnType<typeof moneyFromDecimal>,
  ingredientIds: IngredientIds,
): CartLine | null {
  const container = line.type === CONTAINER;
  const main = container ? mainChild(line) : line;
  if (!main) return null;
  const productId = main.referencedId ?? main.id;
  const parentId = main.payload?.parentId ?? null;
  const extras = container
    ? (line.children ?? [])
        .filter(
          (child) => child !== main && (child.type ?? PRODUCT) === PRODUCT,
        )
        .map((child) => ({
          id: child.referencedId ?? child.id,
          name: child.label ?? "",
          unitPrice: money(child.price?.unitPrice),
        }))
    : [];
  const removed = container ? stringList(line.payload?.without) : [];
  const known = ingredientIds.get(productId);
  return {
    id: line.id,
    configuration: dishConfiguration({
      dishId: parentId ?? productId,
      variantId: parentId ? productId : null,
      extraIds: extras.map((extra) => extra.id),
      removedIngredientIds: removed.flatMap((name) => {
        const id = known?.get(name);
        return id ? [id] : [];
      }),
    }),
    dishNumber:
      (container ? line.payload?.productNumber : undefined) ??
      main.payload?.productNumber ??
      "",
    name: main.label ?? line.label ?? "",
    variant: (main.payload?.options ?? []).flatMap((choice) =>
      choice.group && choice.option
        ? [{ group: choice.group, option: choice.option }]
        : [],
    ),
    extras,
    removedIngredients: removed,
    quantity: line.quantity ?? 1,
    unitPrice: money(line.price?.unitPrice),
    totalPrice: money(line.price?.totalPrice),
    media: toMedia(main.cover ?? line.cover),
  };
}

export function toCart(
  cart: SwCart,
  currency: CurrencyCode,
  ingredientIds: IngredientIds = new Map(),
  /** The visitor's tokens, kept out of the backend's texts. */
  tokens: readonly (string | undefined)[] = [],
): Cart {
  const secrets = [...tokens, cart.token].filter(
    (token): token is string => !!token,
  );
  const clean = (text: string) =>
    secrets.reduce((result, token) => result.replaceAll(token, "***"), text);
  const money = (amount: number | undefined) =>
    moneyFromDecimal(amount ?? 0, currency);
  const items = cart.lineItems ?? [];
  const lines = items
    .filter((item) => item.type === PRODUCT || item.type === CONTAINER)
    .flatMap((item) => toLine(item, money, ingredientIds) ?? []);
  const discounts: CartDiscount[] = items
    .filter((item) => item.type === PROMOTION)
    .map((item) => ({
      code: item.payload?.code || item.referencedId || null,
      name: item.label ?? "",
      amount: money(item.price?.totalPrice),
    }));
  const delivery = cart.deliveries?.[0];
  return deepFreeze({
    lines,
    discounts,
    subtotal: money(cart.price?.positionPrice),
    shippingCosts: money(delivery?.shippingCosts?.totalPrice),
    total: money(cart.price?.totalPrice),
    taxes: (cart.price?.calculatedTaxes ?? []).map((tax) => ({
      rate: tax.taxRate ?? 0,
      amount: money(tax.tax),
    })),
    shippingMethodId: delivery?.shippingMethod?.id ?? null,
    paymentMethodId: cart.transactions?.[0]?.paymentMethodId ?? null,
    messages: toMessages(cart.errors, clean),
  });
}

/** What the adapter needs to know of a product to build a dish line. */
type LookedUp = Readonly<{
  id: Id;
  parentId: Id | null;
  number: string;
  name: string;
  childCount: number;
  ingredients: readonly Readonly<{ id: Id; name: string }>[];
}>;

const LOOKUP_CRITERIA = {
  includes: {
    product: [
      "id",
      "parentId",
      "productNumber",
      "name",
      "translated",
      "childCount",
      "sortedProperties",
    ],
    property_group: ["id", "name", "translated", "options"],
    property_group_option: ["id", "name", "translated"],
  },
  associations: { properties: { associations: { group: {} } } },
};
/** Only the ids of the extras a dish offers. */
const EXTRA_IDS_CRITERIA = {
  includes: { cross_selling_element: ["products"], product: ["id"] },
};

const LOOKUP_TTL_MS = 60_000;
const MAX_KEPT = 1000;

/**
 * Product facts the cart needs on every answer (names, ingredients, the
 * extras a dish offers) are kept for a short while instead of a lookup per
 * answer; a menu change shows within the TTL. Bounded, oldest first out.
 */
function keptFor<T>(ttlMs: number = LOOKUP_TTL_MS) {
  const entries = new Map<string, { at: number; value: T }>();
  return {
    get: (key: string): T | undefined => {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.at > ttlMs) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set: (key: string, value: T) => {
      entries.delete(key);
      entries.set(key, { at: Date.now(), value });
      while (entries.size > MAX_KEPT) {
        entries.delete(entries.keys().next().value!);
      }
    },
  };
}

/** Variants inherit name and main ingredients from their dish. */
const LOOKUP_HEADERS = { "sw-inheritance": "true" };

const invalid = (message: string, value: unknown) =>
  new DomainError("invalid_value", message, { value });

const unavailable = (dishId: Id) =>
  new DomainError("dish_unavailable", "The menu does not offer this dish.", {
    dishId,
  });

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

export type ShopwareCartOptions = Readonly<{
  currency: () => Promise<CurrencyCode>;
  log: AdapterLog;
  /** ms products and the extras of a dish are kept (default 60 s). */
  lookupTtlMs?: number;
  /** ms before a cart write refused as locked is sent again. */
  lockRetryDelayMs?: number;
}>;

/**
 * CartPort over the Store API (`/checkout/cart*`) with the visitor's
 * context token, which is the adapter's session state. A token Shopware
 * issues (first write, or a replaced one) goes into the session.
 */
export function createShopwareCart(
  storeApi: StoreApi,
  visitorApi: VisitorStoreApi,
  options: ShopwareCartOptions,
): CartPort {
  const lockDelay = options.lockRetryDelayMs ?? LOCK_RETRY_DELAY_MS;
  const products = keptFor<LookedUp>(options.lookupTtlMs);
  const offeredExtras = keptFor<ReadonlySet<Id>>(options.lookupTtlMs);

  /** Name, number, parent and main ingredients of products, kept a while. */
  async function lookUp(ids: readonly Id[]): Promise<Map<Id, LookedUp>> {
    const wanted = [...new Set(ids)];
    const result = new Map<Id, LookedUp>();
    for (const id of wanted) {
      const kept = products.get(id);
      if (kept) result.set(id, kept);
    }
    const missing = wanted.filter((id) => !result.has(id));
    if (missing.length) {
      const answer = await requestOrUnavailable("the products", () =>
        storeApi.post<{ elements?: SwProduct[] }>(
          "/product",
          { ids: missing, ...LOOKUP_CRITERIA },
          { headers: LOOKUP_HEADERS },
        ),
      );
      for (const product of answer.elements ?? []) {
        const looked: LookedUp = {
          id: product.id,
          parentId: product.parentId ?? null,
          number: product.productNumber,
          name: translated(product, "name") ?? "",
          childCount: product.childCount ?? 0,
          ingredients: toIngredients(product),
        };
        products.set(product.id, looked);
        result.set(product.id, looked);
      }
    }
    return result;
  }

  /** The extras a dish offers (its `productList` cross-sellings), kept a while. */
  async function extrasOf(dishId: Id): Promise<ReadonlySet<Id>> {
    const known = offeredExtras.get(dishId);
    if (known) return known;
    const groups = await requestOrUnavailable("the extras", () =>
      storeApi.post<{ products?: { id: string }[] }[]>(
        `/product/${dishId}/cross-selling`,
        EXTRA_IDS_CRITERIA,
      ),
    );
    const ids: ReadonlySet<Id> = new Set(
      (groups ?? []).flatMap((group) =>
        (group.products ?? []).map((product) => product.id),
      ),
    );
    offeredExtras.set(dishId, ids);
    return ids;
  }

  /** A variant must be one of the configuration's dish. */
  async function checkVariant(configuration: DishConfiguration) {
    if (!configuration.variantId) return;
    const variant = (await lookUp([configuration.variantId])).get(
      configuration.variantId,
    );
    if (!variant) throw unavailable(configuration.variantId);
    if (variant.parentId !== configuration.dishId) {
      throw invalid("The variant belongs to another dish.", configuration);
    }
  }

  /** The ids of removed ingredients, from the products of the lines. */
  async function ingredientIdsOf(cart: SwCart): Promise<IngredientIds> {
    const withRemovals = (cart.lineItems ?? []).filter(
      (item) =>
        item.type === CONTAINER && stringList(item.payload?.without).length,
    );
    if (!withRemovals.length) return new Map();
    const ids = withRemovals.flatMap((item) => {
      const main = mainChild(item);
      return main ? [main.referencedId ?? main.id] : [];
    });
    try {
      const products = await lookUp(ids);
      return new Map(
        [...products.values()].map((product) => [
          product.id,
          new Map(product.ingredients.map((entry) => [entry.name, entry.id])),
        ]),
      );
    } catch (error) {
      // the names are shown either way; only the ids are missing
      options.log("[shopware][cart] ingredients of the cart's dishes", {
        error,
      });
      return new Map();
    }
  }

  async function send(
    session: BackendSession,
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<SwCart> {
    const token = await session.read();
    const run = () =>
      visitorApi.send<SwCart>({
        method,
        path,
        body,
        contextToken: token,
        ...(session.forwardedFor ? { forwardedFor: session.forwardedFor } : {}),
      });
    let answer;
    try {
      answer = await run();
    } catch (error) {
      const locked =
        statusOf(error) === CART_LOCKED_STATUS ||
        errorCodes(error).includes(CART_LOCKED_CODE);
      if (!locked || method === "GET") throw error;
      await new Promise((resolve) => setTimeout(resolve, lockDelay));
      answer = await run();
    }
    if (answer.contextToken && answer.contextToken !== token) {
      await session.write(answer.contextToken);
    }
    return answer.data;
  }

  async function answer(cart: SwCart, session: BackendSession): Promise<Cart> {
    const [currency, ingredientIds, token] = await Promise.all([
      options.currency(),
      ingredientIdsOf(cart),
      session.read(),
    ]);
    return toCart(cart, currency, ingredientIds, [token]);
  }

  async function write(
    what: string,
    session: BackendSession,
    method: "POST" | "PATCH",
    path: string,
    body: Record<string, unknown>,
  ): Promise<SwCart> {
    return requestOrUnavailable(what, () => send(session, method, path, body));
  }

  async function containerItem(
    configuration: DishConfiguration,
    quantity: number,
  ): Promise<Record<string, unknown>> {
    const productId = orderedDishId(configuration);
    const found = await lookUp([productId, ...configuration.extraIds]);
    const product = found.get(productId);
    if (!product || product.childCount > 0) throw unavailable(productId);
    if (configuration.variantId && product.parentId !== configuration.dishId) {
      throw invalid("The variant belongs to another dish.", configuration);
    }
    // extras hang at the dish; a variant named as the dish has its parent's
    const offered = configuration.extraIds.length
      ? await extrasOf(product.parentId ?? product.id)
      : new Set<Id>();
    const extras = configuration.extraIds.map((id) => {
      const extra = found.get(id);
      if (!extra || !offered.has(id)) {
        throw invalid("The dish does not offer this extra.", id);
      }
      return extra;
    });
    const without = configuration.removedIngredientIds.map((id) => {
      const ingredient = product.ingredients.find((entry) => entry.id === id);
      if (!ingredient) {
        throw invalid("The dish has no such main ingredient.", id);
      }
      return ingredient.name;
    });
    const label = [
      product.name,
      ...extras.map((extra) => `+${extra.name}`),
      ...without.map((name) => `-${name}`),
    ].join(" ");
    return {
      id: containerLineId(productId, configuration.extraIds, without),
      quantity,
      type: CONTAINER,
      label,
      payload: { productNumber: product.number, without },
      children: [
        {
          id: uuidv4().replaceAll("-", ""),
          quantity,
          type: PRODUCT,
          referencedId: productId,
        },
        ...extras.map((extra) => ({
          id: extra.id,
          quantity,
          type: PRODUCT,
        })),
      ],
    };
  }

  return {
    getCart: async (session) => {
      // a visitor without a token has an empty cart: no request for it
      if (!(await session.read())) return answer({}, session);
      return answer(
        await requestOrUnavailable("the cart", () =>
          send(session, "GET", "/checkout/cart"),
        ),
        session,
      );
    },

    addLine: async (session, configuration, quantity) => {
      checkQuantity(quantity, 1);
      const productId = orderedDishId(configuration);
      if (isPlainDish(configuration)) await checkVariant(configuration);
      const item = isPlainDish(configuration)
        ? { id: productId, quantity, type: PRODUCT }
        : await containerItem(configuration, quantity);
      const cart = await write(
        "a cart line",
        session,
        "POST",
        "/checkout/cart/line-item",
        {
          items: [item],
        },
      );
      // Shopware drops an unknown product (and a dish that needs a
      // variant) and answers the cart without it
      if (!(cart.lineItems ?? []).some((line) => line.id === item.id)) {
        throw unavailable(productId);
      }
      return answer(cart, session);
    },

    changeQuantity: async (session, lineId, quantity) => {
      checkQuantity(quantity, 0);
      if (quantity === 0) {
        return answer(
          await write(
            "a cart line",
            session,
            "POST",
            "/checkout/cart/line-item/delete",
            {
              ids: [lineId],
            },
          ),
          session,
        );
      }
      return answer(
        await write(
          "a cart line",
          session,
          "PATCH",
          "/checkout/cart/line-item",
          {
            items: [{ id: lineId, quantity }],
          },
        ),
        session,
      );
    },

    removeLine: async (session, lineId) =>
      answer(
        await write(
          "a cart line",
          session,
          "POST",
          "/checkout/cart/line-item/delete",
          {
            ids: [lineId],
          },
        ),
        session,
      ),

    applyVoucher: async (session, code) => {
      const voucher = code.trim();
      if (!voucher || voucher.length > 255) {
        throw invalid("A voucher code is needed.", code);
      }
      return answer(
        await write("a voucher", session, "POST", "/checkout/cart/line-item", {
          items: [{ referencedId: voucher, type: PROMOTION }],
        }),
        session,
      );
    },

    removeVoucher: async (session, code) => {
      const current = await requestOrUnavailable("the cart", () =>
        send(session, "GET", "/checkout/cart"),
      );
      const ids = (current.lineItems ?? [])
        .filter(
          (item) =>
            item.type === PROMOTION &&
            (item.payload?.code === code || item.referencedId === code),
        )
        .map((item) => item.id);
      if (!ids.length) return answer(current, session);
      return answer(
        await write(
          "a voucher",
          session,
          "POST",
          "/checkout/cart/line-item/delete",
          { ids },
        ),
        session,
      );
    },
  };
}

/**
 * A Store API request as the cart answers its failure: 404 (a line the
 * cart does not hold) is `not_found`, 400 `invalid_value`, everything else
 * `backend_unavailable`. DomainErrors of the adapter pass unchanged.
 */
async function requestOrUnavailable<T>(
  what: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof DomainError) throw error;
    const status = statusOf(error);
    // Shopware's texts carry the context token ("Cart with token … is
    // locked") and the URL: the logged cause names status and codes only
    const cause = new Error(
      `Shopware ${status ?? "gave no answer"}${errorCodes(error).length ? ` ${errorCodes(error).join(", ")}` : ""} (${(error as Error | null)?.name ?? "Error"})`,
    );
    if (status === 404) {
      throw new DomainError(
        "not_found",
        `Shopware knows no ${what}.`,
        {},
        { cause },
      );
    }
    if (status === 400) {
      throw new DomainError(
        "invalid_value",
        `Shopware refused ${what}.`,
        {},
        { cause },
      );
    }
    throw new DomainError(
      "backend_unavailable",
      `Shopware did not answer for ${what}.`,
      {},
      { cause },
    );
  }
}
