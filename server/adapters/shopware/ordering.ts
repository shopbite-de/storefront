import {
  addDays,
  deepFreeze,
  dishConfiguration,
  DomainError,
  formatTimeOfDay,
  isDomainError,
  moneyFromDecimal,
  wishedTime,
  zonedDateTime,
  type Address,
  type AddressInput,
  type CheckoutSelection,
  type CurrencyCode,
  type Customer,
  type DomainErrorCode,
  type Fulfillment,
  type GuestDetails,
  type Id,
  type Order,
  type Orderer,
  type OrderLine,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type Salutation,
  type TimeZone,
  type WishedTime,
} from "../../../shared/domain";
import type {
  BackendSession,
  CheckoutPort,
  OrderPort,
  PlaceOrderCommand,
} from "../../ports";
import {
  deadline,
  keptFor,
  LOOKUP_CRITERIA,
  LOOKUP_HEADERS,
  mainChild,
  messageCode,
  REQUEST_TIMEOUT_MS,
  stringList,
  type SwCart,
  type SwCartError,
  type SwLineItem,
} from "./cart";
import { toIngredients, toMedia, type SwProduct } from "./catalog";
import { errorCodes, statusOf } from "./request";
import { text, type AdapterLog } from "./shop";
import type { StoreApi, VisitorStoreApi } from "./storeApi";

/*
 * Checkout and orders over the Store API with the visitor's context token
 * (ADR 0001, step 5). What Shopware stores stays as the storefront wrote
 * it before: a guest is a guest customer (`/account/register` with
 * `guest: true`, the request of the 2.x checkout form), the order is
 * `/checkout/order` with only the customer comment, which carries the
 * wished time ("Wunschlieferzeit: 18:40", "Wunschabholzeit: 18:40"; the
 * receipt printer and the backoffice read it), and the payment is
 * `/handle-payment`. The order request is never sent twice.
 */

type Translated<T> = T & { translated?: Partial<T> | null };
type SwSalutation = { salutationKey?: string | null } | null;
export type SwAddress = {
  id: string;
  salutation?: SwSalutation;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  department?: string | null;
  street?: string | null;
  additionalAddressLine1?: string | null;
  zipcode?: string | null;
  city?: string | null;
  countryId?: string | null;
  country?: { iso?: string | null } | null;
  phoneNumber?: string | null;
};
export type SwCustomer = {
  id: string;
  guest?: boolean;
  active?: boolean;
  doubleOptInRegistration?: boolean;
  email?: string;
  salutation?: SwSalutation;
  firstName?: string;
  lastName?: string;
  defaultBillingAddressId?: string | null;
  defaultShippingAddressId?: string | null;
  defaultBillingAddress?: SwAddress | null;
  defaultShippingAddress?: SwAddress | null;
};
type SwContext = {
  token?: string;
  shippingMethod?: { id?: string } | null;
  paymentMethod?: { id?: string } | null;
  salesChannel?: {
    paymentMethodId?: string | null;
    domains?: { url?: string; languageId?: string }[] | null;
  } | null;
  context?: { languageIdChain?: string[] } | null;
};
type SwPaymentMethod = Translated<{
  id: string;
  name?: string | null;
  description?: string | null;
  asynchronous?: boolean | null;
  media?: Parameters<typeof toMedia>[0];
}>;
type SwOrderLineItem = SwLineItem & {
  parentId?: string | null;
  unitPrice?: number;
  totalPrice?: number;
  position?: number;
};
type SwState = { technicalName?: string } | null;
export type SwOrder = {
  id: string;
  orderNumber?: string;
  orderDateTime?: string;
  createdAt?: string;
  customerComment?: string | null;
  amountTotal?: number;
  shippingTotal?: number;
  positionPrice?: number;
  taxStatus?: string;
  price?: {
    positionPrice?: number;
    totalPrice?: number;
    taxStatus?: string;
    calculatedTaxes?: { tax?: number; taxRate?: number }[] | null;
  } | null;
  stateMachineState?: SwState;
  billingAddressId?: string;
  addresses?: SwAddress[] | null;
  orderCustomer?: { email?: string } | null;
  lineItems?: SwOrderLineItem[] | null;
  deliveries?:
    | {
        shippingMethodId?: string;
        shippingMethod?: Translated<{
          id?: string;
          name?: string | null;
          customFields?: Record<string, unknown> | null;
        }> | null;
        shippingOrderAddress?: SwAddress | null;
      }[]
    | null;
  transactions?:
    | {
        createdAt?: string;
        paymentMethodId?: string;
        paymentMethod?: Translated<{
          id?: string;
          name?: string | null;
        }> | null;
        stateMachineState?: SwState;
      }[]
    | null;
};

export const ADDRESS_ASSOCIATIONS = { country: {}, salutation: {} };

/** The associations an order answer needs (`/order`). */
export const ORDER_ASSOCIATIONS = {
  stateMachineState: {},
  lineItems: {},
  addresses: { associations: ADDRESS_ASSOCIATIONS },
  deliveries: {
    associations: {
      shippingMethod: {},
      shippingOrderAddress: { associations: ADDRESS_ASSOCIATIONS },
    },
  },
  transactions: {
    associations: { paymentMethod: {}, stateMachineState: {} },
  },
};

export const CUSTOMER_CRITERIA = {
  associations: {
    salutation: {},
    defaultBillingAddress: { associations: ADDRESS_ASSOCIATIONS },
    defaultShippingAddress: { associations: ADDRESS_ASSOCIATIONS },
  },
};

const PAYMENT_METHOD_CRITERIA = {
  onlyAvailable: true,
  associations: { media: {} },
};

/** "Wunschlieferzeit: 18:40" (the receipt printer and backoffice read it). */
const WISHED_TIME_WORD: Readonly<Record<Fulfillment, string>> = {
  delivery: "Wunschlieferzeit",
  pickup: "Wunschabholzeit",
};

/** Older orders say "Wunschzeit"; orders before lead times per method always "Wunschlieferzeit". */
const WISHED_TIME_COMMENT =
  /^Wunsch(?:liefer|abhol)?zeit:\s*(\d{1,2}):(\d{2})\s*(?:\n|$)/;

/** The customer comment of an order: the wished time, then the note. */
export function orderComment(command: PlaceOrderCommand): string {
  const line = `${WISHED_TIME_WORD[command.fulfillment]}: ${formatTimeOfDay(command.wishedTime.time)}`;
  return command.note ? `${line}\n${command.note}` : line;
}

/**
 * The wished time and the note of a customer comment. The comment holds
 * the time only: its service date is the order's date in the restaurant's
 * time zone, or the next day for a time well before the order was placed
 * (an order at 23:50 for 00:20).
 */
export function readComment(
  comment: string | null | undefined,
  placedAt: string | undefined,
  zone: TimeZone,
): { wishedTime: WishedTime | null; note: string | null } {
  const value = comment?.trim() ?? "";
  const match = WISHED_TIME_COMMENT.exec(value);
  const instant = placedAt ? new Date(placedAt) : undefined;
  if (!match || !instant || Number.isNaN(instant.getTime())) {
    return { wishedTime: null, note: value || null };
  }
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  const rest = value.slice(match[0].length).trim();
  try {
    const placed = zonedDateTime(instant, zone);
    const date =
      minutes < placed.time.minutes - 30
        ? addDays(placed.date, 1)
        : placed.date;
    return { wishedTime: wishedTime(date, minutes), note: rest || null };
  } catch {
    return { wishedTime: null, note: value || null };
  }
}

const SALUTATIONS: readonly Salutation[] = ["mr", "mrs", "not_specified"];

export const toSalutation = (
  value: SwSalutation | undefined,
): Salutation | null => {
  const key = value?.salutationKey;
  return SALUTATIONS.includes(key as Salutation) ? (key as Salutation) : null;
};

const ORDER_STATUS: Readonly<Record<string, OrderStatus>> = {
  open: "open",
  in_progress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
};

const PAYMENT_STATUS: Readonly<Record<string, PaymentStatus>> = {
  open: "open",
  reminded: "open",
  authorized: "open",
  unconfirmed: "open",
  in_progress: "open",
  paid_partially: "open",
  paid: "paid",
  failed: "failed",
  chargeback: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
  refunded_partially: "refunded",
};

const translatedName = (
  entity: Translated<{ name?: string | null }> | null | undefined,
) => text(entity?.translated?.name) ?? text(entity?.name) ?? "";

/** The cart errors that keep Shopware from placing an order, as domain codes. */
const REFUSALS: readonly [string, DomainErrorCode][] = [
  ["ordering_closed", "ordering_closed"],
  ["shipping_method_blocked", "shipping_method_blocked"],
  ["payment_method_blocked", "payment_method_blocked"],
  ["dish_unavailable", "dish_unavailable"],
];

export const fail = (code: DomainErrorCode, message: string, cause?: unknown) =>
  new DomainError(code, message, {}, cause ? { cause } : undefined);

/**
 * A cause for the log that carries no token or URL (status and codes
 * only); a failure without an answer counts as an outage (503) for the
 * BFF's backoff.
 */
export const causeOf = (error: unknown) => {
  const status = statusOf(error);
  return Object.assign(
    new Error(
      `Shopware ${status ?? "gave no answer"}${errorCodes(error).length ? ` ${errorCodes(error).join(", ")}` : ""} (${(error as Error | null)?.name ?? "Error"})`,
    ),
    { statusCode: status ?? 503 },
  );
};

/** The fields Shopware's validation refused (`/email`, `/billingAddress/zipcode`). */
export const refusedFields = (error: unknown): string[] =>
  (
    (
      error as {
        data?: { errors?: { source?: { pointer?: string } }[] };
      } | null
    )?.data?.errors ?? []
  ).flatMap((entry) =>
    entry.source?.pointer
      ? [entry.source.pointer.replace(/^\//, "").replaceAll("/", ".")]
      : [],
  );

/**
 * What the account (`customer.ts`) shares with the checkout: the visitor's
 * requests, the address and customer mappings, the storefront URL of the
 * sales channel.
 */
export type ShopwareVisitorTools = Readonly<{
  shop: {
    get<T>(path: string): Promise<T>;
    post<T>(
      path: string,
      body: Record<string, unknown>,
      headers?: Record<string, string>,
    ): Promise<T>;
  };
  send<T>(
    session: BackendSession,
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T>;
  toAddress(address: SwAddress): Promise<Address>;
  toCustomer(
    customer: SwCustomer,
    billingAddress: Address | null,
    deliveryAddress?: Address | null,
  ): Customer;
  addressBody(address: AddressInput): Promise<Record<string, unknown>>;
  salutationId(salutation: Salutation | null): Promise<string>;
  readOrderer(session: BackendSession): Promise<Orderer | null>;
  storefrontUrlFor(preferred: string): Promise<string>;
}>;

/** How long the order request may take: it must not be cut off early. */
export const ORDER_TIMEOUT_MS = 60_000;

export type ShopwareOrderingOptions = Readonly<{
  currency: () => Promise<CurrencyCode>;
  timeZone: TimeZone;
  log: AdapterLog;
  /** ms every Store API request may take (default 10 s). */
  requestTimeoutMs?: number;
  /**
   * ms the order request may take (default 60 s): Shopware may still
   * commit an order the storefront stopped waiting for, so it waits long.
   */
  orderTimeoutMs?: number;
  /** The Shopware id of the shop's country (`public.site.countryId`). */
  countryId?: string;
  /** ms country ids and product facts are kept (default 10 min / 60 s). */
  countryTtlMs?: number;
  lookupTtlMs?: number;
}>;

/**
 * CheckoutPort (but the shipping methods, `checkout.ts`) and OrderPort
 * over the Store API with the visitor's context token.
 */
export function createShopwareOrdering(
  shopApi: StoreApi,
  visitorApi: VisitorStoreApi,
  options: ShopwareOrderingOptions,
): {
  checkout: Omit<CheckoutPort, "listShippingMethods">;
  orders: OrderPort;
  visitor: ShopwareVisitorTools;
} {
  const timeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const orderTimeoutMs = options.orderTimeoutMs ?? ORDER_TIMEOUT_MS;
  const shop = {
    get: <T>(path: string) => deadline(shopApi.get<T>(path), timeoutMs),
    post: <T>(
      path: string,
      body: Record<string, unknown>,
      headers?: Record<string, string>,
    ) =>
      deadline(
        headers
          ? shopApi.post<T>(path, body, { headers })
          : shopApi.post<T>(path, body),
        timeoutMs,
      ),
  };
  const countries = keptFor<ReadonlyMap<string, string>>(
    options.countryTtlMs ?? 600_000,
  );
  const salutationIds = keptFor<ReadonlyMap<string, string>>(
    options.countryTtlMs ?? 600_000,
  );
  const ingredients = keptFor<ReadonlyMap<string, Id>>(options.lookupTtlMs);
  /** The sales channel's domains and language (storefront URLs). */
  const channels = keptFor<SwContext>(options.countryTtlMs ?? 600_000);

  /** A Store API request for the visitor; a new token goes into the session. */
  async function send<T>(
    session: BackendSession,
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
    ms: number = timeoutMs,
  ): Promise<T> {
    const token = await session.read();
    const answer = await deadline(
      visitorApi.send<T>({
        method,
        path,
        body,
        contextToken: token,
        ...(session.forwardedFor ? { forwardedFor: session.forwardedFor } : {}),
      }),
      ms,
    );
    if (answer.contextToken && answer.contextToken !== token) {
      await session.write(answer.contextToken);
    }
    return answer.data;
  }

  /**
   * A request as the port answers its failure: the given codes for 403
   * and 404, 400 `invalid_value`, everything else `backend_unavailable`.
   */
  async function ask<T>(
    what: string,
    run: () => Promise<T>,
    codes: Partial<Record<400 | 403 | 404, DomainErrorCode>> = {},
  ): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (isDomainError(error)) throw error;
      // Shopware answers a missing customer with 401 or 403
      const status = statusOf(error) === 401 ? 403 : statusOf(error);
      const code =
        status === 400 || status === 403 || status === 404
          ? (codes[status] ??
            (status === 400
              ? "invalid_value"
              : status === 404
                ? "not_found"
                : undefined))
          : undefined;
      throw fail(
        code ?? "backend_unavailable",
        code
          ? `Shopware refused ${what}.`
          : `Shopware did not answer for ${what}.`,
        causeOf(error),
      );
    }
  }

  /**
   * The id of a country of the sales channel by its ISO code, kept a
   * while. Asked by code: the Store API lists at most 100 per request.
   */
  async function countryId(code: string): Promise<string> {
    const iso = code.toUpperCase();
    let id = countries.get(iso)?.get(iso);
    if (!id) {
      const answer = await ask("the country", () =>
        shop.post<{ elements?: { id: string; iso?: string | null }[] }>(
          "/country",
          {
            filter: [{ type: "equals", field: "iso", value: iso }],
            includes: { country: ["id", "iso"] },
          },
        ),
      );
      id = answer.elements?.find(
        (country) => country.iso?.toUpperCase() === iso,
      )?.id;
      if (id) countries.set(iso, new Map([[iso, id]]));
    }
    if (!id) {
      throw new DomainError(
        "invalid_value",
        "The shop does not deliver to this country.",
        { field: "country", value: code },
      );
    }
    return id;
  }

  /** The id of a salutation; null is Shopware's "not given" (empty id). */
  async function salutationId(salutation: Salutation | null): Promise<string> {
    if (salutation === null) return "";
    let map = salutationIds.get("all");
    if (!map) {
      const answer = await ask("the salutations", () =>
        shop.post<{ elements?: { id: string; salutationKey?: string }[] }>(
          "/salutation",
          { includes: { salutation: ["id", "salutationKey"] } },
        ),
      );
      map = new Map(
        (answer.elements ?? []).flatMap((entry) =>
          entry.salutationKey ? [[entry.salutationKey, entry.id] as const] : [],
        ),
      );
      salutationIds.set("all", map);
    }
    return map.get(salutation) ?? "";
  }

  async function toAddress(address: SwAddress): Promise<Address> {
    // every read asks for the `country` association
    const country = address.country?.iso?.toUpperCase() ?? null;
    return {
      id: address.id,
      salutation: toSalutation(address.salutation),
      firstName: address.firstName ?? "",
      lastName: address.lastName ?? "",
      company: text(address.company),
      department: text(address.department),
      street: address.street ?? "",
      additionalLine: text(address.additionalAddressLine1),
      postalCode: address.zipcode ?? "",
      city: address.city ?? "",
      country: country ?? "",
      phone: text(address.phoneNumber),
    };
  }

  /** The country of an address: the shop's own when it has none. */
  async function countryOf(code: string | null): Promise<string> {
    if (code) return countryId(code);
    if (options.countryId) return options.countryId;
    throw new DomainError(
      "invalid_value",
      "The shop has no country for an address without one.",
      { field: "country", value: code },
    );
  }

  /** The address as the checkout form of 2.x sent it to Shopware. */
  async function addressBody(
    address: AddressInput,
  ): Promise<Record<string, unknown>> {
    return {
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company ?? "",
      department: address.department ?? "",
      salutationId: await salutationId(address.salutation),
      street: address.street,
      additionalAddressLine1: address.additionalLine ?? "",
      zipcode: address.postalCode,
      city: address.city,
      countryId: await countryOf(address.country),
      phoneNumber: address.phone ?? "",
    };
  }

  function toCustomer(
    customer: SwCustomer,
    billingAddress: Address | null,
    deliveryAddress: Address | null = billingAddress,
  ): Customer {
    return deepFreeze({
      id: customer.id,
      guest: customer.guest === true,
      email: customer.email ?? "",
      salutation: toSalutation(customer.salutation),
      firstName: customer.firstName ?? "",
      lastName: customer.lastName ?? "",
      phone:
        billingAddress?.phone ??
        text(customer.defaultBillingAddress?.phoneNumber) ??
        null,
      defaultBillingAddressId:
        customer.defaultBillingAddressId ?? billingAddress?.id ?? null,
      defaultDeliveryAddressId:
        customer.defaultShippingAddressId ?? deliveryAddress?.id ?? null,
    });
  }

  async function toOrderer(customer: SwCustomer): Promise<Orderer> {
    const billingSource =
      customer.defaultBillingAddress ?? customer.defaultShippingAddress;
    const deliverySource =
      customer.defaultShippingAddress ?? customer.defaultBillingAddress;
    if (!billingSource || !deliverySource) {
      throw fail(
        "backend_unavailable",
        "Shopware answered a customer without address.",
      );
    }
    const billingAddress = await toAddress(billingSource);
    const deliveryAddress =
      deliverySource.id === billingSource.id
        ? billingAddress
        : await toAddress(deliverySource);
    const value = toCustomer(customer, billingAddress, deliveryAddress);
    return deepFreeze({ customer: value, billingAddress, deliveryAddress });
  }

  async function readOrderer(session: BackendSession): Promise<Orderer | null> {
    if (!(await session.read())) return null;
    try {
      const customer = await send<SwCustomer>(
        session,
        "POST",
        "/account/customer",
        CUSTOMER_CRITERIA,
      );
      return await toOrderer(customer);
    } catch (error) {
      if (isDomainError(error)) throw error;
      // a visitor without guest or customer
      if (statusOf(error) === 403 || statusOf(error) === 401) return null;
      throw fail(
        "backend_unavailable",
        "Shopware did not answer for the customer.",
        causeOf(error),
      );
    }
  }

  async function context(session?: BackendSession): Promise<SwContext> {
    if (session && (await session.read())) {
      return ask("the context", () =>
        send<SwContext>(session, "GET", "/context"),
      );
    }
    return ask("the context", () => shop.get<SwContext>("/context"));
  }

  const toSelection = (value: SwContext): CheckoutSelection =>
    deepFreeze({
      shippingMethodId: value.shippingMethod?.id ?? null,
      paymentMethodId: value.paymentMethod?.id ?? null,
    });

  async function select(
    session: BackendSession,
    change: Record<string, string>,
    what: string,
  ): Promise<CheckoutSelection> {
    await ask(what, () => send(session, "PATCH", "/context", change));
    return toSelection(await context(session));
  }

  /**
   * The storefront URL for Shopware's e-mail links: one of the sales
   * channel's domains, as the Shopware layer chose it (the domain the
   * guest orders on, else the first domain of the context's language).
   */
  async function storefrontUrlFor(preferred: string): Promise<string> {
    let value = channels.get("context");
    if (!value) {
      value = await context().catch(() => undefined);
      if (value) channels.set("context", value);
    }
    value ??= {};
    const domains = value.salesChannel?.domains ?? [];
    const normalized = preferred.replace(/\/$/, "");
    const matching = domains.find(
      (domain) => domain.url?.replace(/\/$/, "") === normalized,
    );
    if (matching?.url) return matching.url;
    const languageId = value.context?.languageIdChain?.[0];
    return (
      domains.find((domain) => domain.languageId === languageId)?.url ??
      preferred
    );
  }

  /** Ingredient ids by product id and name, for the removed ingredients. */
  async function ingredientIdsOf(
    productIds: readonly Id[],
  ): Promise<ReadonlyMap<string, Id>> {
    const result = new Map<string, Id>();
    const missing = [...new Set(productIds)].filter((id) => {
      const kept = ingredients.get(id);
      kept?.forEach((value, key) => result.set(`${id}|${key}`, value));
      return !kept;
    });
    if (missing.length) {
      try {
        const answer = await shop.post<{ elements?: SwProduct[] }>(
          "/product",
          { ids: missing, ...LOOKUP_CRITERIA },
          LOOKUP_HEADERS,
        );
        for (const product of answer.elements ?? []) {
          const names = new Map(
            toIngredients(product).map((entry) => [entry.name, entry.id]),
          );
          ingredients.set(product.id, names);
          names.forEach((value, key) =>
            result.set(`${product.id}|${key}`, value),
          );
        }
      } catch (error) {
        // the names are shown either way; only the ids are missing
        options.log("[shopware][orders] ingredients of the ordered dishes", {
          error: causeOf(error).message,
        });
      }
    }
    return result;
  }

  async function toOrder(
    order: SwOrder,
    tokens: readonly (string | undefined)[],
  ): Promise<Order> {
    const currency = await ask("the currency", () =>
      deadline(options.currency(), timeoutMs),
    );
    const money = (amount: number | undefined) =>
      moneyFromDecimal(amount ?? 0, currency);
    const secrets = tokens.filter((token): token is string => !!token);
    const clean = (value: string) =>
      secrets.reduce((result, token) => result.replaceAll(token, "***"), value);
    const items = order.lineItems ?? [];
    const childrenOf = (id: string) =>
      items
        .filter((item) => item.parentId === id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const top = items
      .filter((item) => !item.parentId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const dishes = top.filter(
      (item) => item.type === "product" || item.type === "container",
    );
    const withRemovals = dishes.flatMap((item) => {
      if (
        item.type !== "container" ||
        !stringList(item.payload?.without).length
      )
        return [];
      const main = mainChild({ ...item, children: childrenOf(item.id) });
      return main ? [main.referencedId ?? main.id] : [];
    });
    const ingredientIds = withRemovals.length
      ? await ingredientIdsOf(withRemovals)
      : new Map<string, Id>();

    const lines: OrderLine[] = dishes.flatMap((item) => {
      const container = item.type === "container";
      const children = container
        ? (childrenOf(item.id) as SwOrderLineItem[])
        : [];
      const main = (container ? mainChild({ ...item, children }) : item) as
        SwOrderLineItem | undefined;
      if (!main) return [];
      const productId = main.referencedId ?? main.id;
      const parentId = main.payload?.parentId ?? null;
      const extras = children.filter(
        (child) => child !== main && (child.type ?? "product") === "product",
      );
      const removed = container ? stringList(item.payload?.without) : [];
      return [
        {
          id: item.id,
          configuration: dishConfiguration({
            dishId: parentId ?? productId,
            variantId: parentId ? productId : null,
            extraIds: extras.map((extra) => extra.referencedId ?? extra.id),
            removedIngredientIds: removed.flatMap((name) => {
              const id = ingredientIds.get(`${productId}|${name}`);
              return id ? [id] : [];
            }),
          }),
          dishNumber:
            (container ? item.payload?.productNumber : undefined) ??
            main.payload?.productNumber ??
            "",
          name: main.label ?? item.label ?? "",
          extras: extras.map((extra) => ({
            name: extra.label ?? "",
            unitPrice: money(extra.unitPrice ?? extra.price?.unitPrice),
          })),
          removedIngredients: removed,
          quantity: item.quantity ?? 1,
          unitPrice: money(item.unitPrice ?? item.price?.unitPrice),
          totalPrice: money(item.totalPrice ?? item.price?.totalPrice),
        },
      ];
    });

    const delivery = order.deliveries?.[0];
    const method = delivery?.shippingMethod;
    const fields =
      method?.translated?.customFields ?? method?.customFields ?? {};
    const fulfillment: Fulfillment =
      fields?.shopbite_fulfillment === "pickup" ? "pickup" : "delivery";
    const transaction = [...(order.transactions ?? [])]
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
      .at(-1);
    const billingSource =
      order.addresses?.find((entry) => entry.id === order.billingAddressId) ??
      order.addresses?.[0];
    if (!billingSource) {
      throw fail(
        "backend_unavailable",
        "Shopware answered an order without billing address.",
      );
    }
    const billingAddress = await toAddress(billingSource);
    const deliveryAddress =
      fulfillment === "pickup" || !delivery?.shippingOrderAddress
        ? null
        : await toAddress(delivery.shippingOrderAddress);
    const placedAt =
      order.orderDateTime ?? order.createdAt ?? new Date().toISOString();
    const { wishedTime: wished, note } = readComment(
      order.customerComment,
      placedAt,
      options.timeZone,
    );
    const taxStatus = order.taxStatus ?? order.price?.taxStatus;
    return deepFreeze({
      id: order.id,
      number: order.orderNumber ?? "",
      placedAt: new Date(placedAt).toISOString(),
      status:
        ORDER_STATUS[order.stateMachineState?.technicalName ?? ""] ?? "open",
      paymentStatus:
        PAYMENT_STATUS[transaction?.stateMachineState?.technicalName ?? ""] ??
        "open",
      fulfillment,
      wishedTime: wished,
      shippingMethod: {
        id: method?.id ?? delivery?.shippingMethodId ?? "",
        name: translatedName(method),
      },
      paymentMethod: {
        id:
          transaction?.paymentMethod?.id ?? transaction?.paymentMethodId ?? "",
        name: translatedName(transaction?.paymentMethod),
      },
      lines,
      discounts: top
        .filter((item) => item.type === "promotion")
        .map((item) => ({
          code: item.payload?.code || item.referencedId || null,
          name: item.label ?? "",
          amount: money(item.totalPrice ?? item.price?.totalPrice),
        })),
      subtotal: money(order.price?.positionPrice ?? order.positionPrice),
      shippingCosts: money(order.shippingTotal),
      total: money(order.amountTotal ?? order.price?.totalPrice),
      taxes: (order.price?.calculatedTaxes ?? []).map((tax) => ({
        rate: tax.taxRate ?? 0,
        amount: money(tax.tax),
      })),
      taxIncluded: taxStatus !== "net",
      billingAddress,
      deliveryAddress,
      email: order.orderCustomer?.email ?? "",
      note: note === null ? null : clean(note),
    });
  }

  async function readOrders(
    session: BackendSession,
    criteria: Record<string, unknown>,
  ): Promise<{ elements: SwOrder[]; total: number }> {
    const answer = await send<{
      orders?: { elements?: SwOrder[]; total?: number };
    }>(session, "POST", "/order", {
      ...criteria,
      associations: ORDER_ASSOCIATIONS,
    });
    const elements = answer.orders?.elements ?? [];
    return { elements, total: answer.orders?.total ?? elements.length };
  }

  async function getOrder(
    session: BackendSession,
    orderId: Id,
  ): Promise<Order> {
    const token = await session.read();
    if (!token) throw fail("not_found", "There is no such order.");
    const found = await ask(
      "the order",
      () => readOrders(session, { ids: [orderId] }),
      // another visitor's order or no customer: as if there were none
      { 400: "not_found", 403: "not_found" },
    );
    const order = found.elements.find((entry) => entry.id === orderId);
    if (!order) throw fail("not_found", "There is no such order.");
    return toOrder(order, [token]);
  }

  /** Why Shopware refuses to place the cart, from its errors. */
  async function refusal(
    session: BackendSession,
    cause: unknown,
  ): Promise<DomainError> {
    let errors: SwCartError[] = [];
    try {
      const cart = await send<SwCart>(session, "GET", "/checkout/cart");
      errors = Object.values(cart.errors ?? {}).filter(
        (error) => (error.level ?? 0) >= 20,
      );
    } catch {
      // the order was refused either way
    }
    const codes = errors.map((error) => messageCode(error) as string);
    const code =
      REFUSALS.find(([cartCode]) => codes.includes(cartCode))?.[1] ??
      "validation_failed";
    return fail(code, "Shopware refused the order.", causeOf(cause));
  }

  const checkout: Omit<CheckoutPort, "listShippingMethods"> = {
    listPaymentMethods: async (session) => {
      const visitor = session && (await session.read()) ? session : undefined;
      const [methods, current] = await Promise.all([
        ask("the payment methods", () =>
          visitor
            ? send<{ elements?: SwPaymentMethod[] }>(
                visitor,
                "POST",
                "/payment-method",
                PAYMENT_METHOD_CRITERIA,
              )
            : shop.post<{ elements?: SwPaymentMethod[] }>(
                "/payment-method",
                PAYMENT_METHOD_CRITERIA,
              ),
        ),
        // the methods without the shop's default rather than none
        context(visitor).catch((error) => {
          options.log(
            "[shopware][checkout] the shop's default payment method",
            {
              error: (error as Error).message,
            },
          );
          return {} as SwContext;
        }),
      ]);
      const preferred = current.salesChannel?.paymentMethodId ?? null;
      return deepFreeze(
        (methods.elements ?? []).map((method): PaymentMethod => ({
          id: method.id,
          name: translatedName(method),
          description:
            text(method.translated?.description) ?? text(method.description),
          media: toMedia(method.media),
          redirects: method.asynchronous === true,
          preferred: method.id === preferred,
        })),
      );
    },

    getSelection: async (session) => toSelection(await context(session)),

    selectShippingMethod: (session, methodId) =>
      select(session, { shippingMethodId: methodId }, "the shipping method"),

    selectPaymentMethod: (session, methodId) =>
      select(session, { paymentMethodId: methodId }, "the payment method"),

    getOrderer: readOrderer,

    registerGuest: async (session, guest: GuestDetails, storefrontUrl) => {
      const [billingAddress, shippingAddress, url] = await Promise.all([
        addressBody({
          ...guest.billingAddress,
          // the form's billing names are the guest's
          firstName: guest.billingAddress.firstName || guest.firstName,
          lastName: guest.billingAddress.lastName || guest.lastName,
        }),
        guest.deliveryAddress ? addressBody(guest.deliveryAddress) : undefined,
        storefrontUrlFor(storefrontUrl),
      ]);
      try {
        await send(session, "POST", "/account/register", {
          accountType: guest.business ? "business" : "private",
          email: guest.email,
          firstName: guest.firstName,
          lastName: guest.lastName,
          guest: true,
          acceptedDataProtection: true,
          storefrontUrl: url,
          billingAddress,
          ...(shippingAddress ? { shippingAddress } : {}),
        });
      } catch (error) {
        if (statusOf(error) === 400) {
          throw new DomainError(
            "validation_failed",
            "Shopware refused the guest's details.",
            { fields: refusedFields(error) },
            { cause: causeOf(error) },
          );
        }
        throw fail(
          "backend_unavailable",
          "Shopware did not answer for the guest.",
          causeOf(error),
        );
      }
      const orderer = await readOrderer(session);
      if (!orderer) {
        throw fail("backend_unavailable", "Shopware did not keep the guest.");
      }
      return orderer;
    },

    updateAddress: async (session, address) => {
      if (!address.id || !(await session.read())) {
        throw fail("not_found", "There is no such address.");
      }
      const { id, ...fields } = address;
      const body = await addressBody({
        ...fields,
        country: fields.country || null,
      });
      // the address form of 2.x sent none: a change without one keeps it
      if (fields.salutation === null) delete body.salutationId;
      await ask(
        "the address",
        async () => {
          try {
            return await send(
              session,
              "PATCH",
              `/account/address/${encodeURIComponent(id)}`,
              { ...body, id },
            );
          } catch (error) {
            // another customer's address: Shopware answers 400
            if (
              errorCodes(error).includes("CHECKOUT__CUSTOMER_ADDRESS_NOT_FOUND")
            ) {
              throw fail("not_found", "There is no such address.");
            }
            throw error;
          }
        },
        { 403: "not_found", 404: "not_found" },
      );
      const orderer = await readOrderer(session);
      if (!orderer) throw fail("not_found", "There is no such address.");
      return orderer;
    },

    placeOrder: async (session, command) => {
      const token = await session.read();
      if (!token)
        throw fail("unauthenticated", "Ordering needs a guest or a customer.");
      let order: SwOrder;
      try {
        // sent once: an answer that does not come may still be an order
        order = await send<SwOrder>(
          session,
          "POST",
          "/checkout/order",
          { customerComment: orderComment(command) },
          orderTimeoutMs,
        );
      } catch (error) {
        const status = statusOf(error);
        const codes = errorCodes(error);
        if (status === 403 || status === 401) {
          throw fail(
            "unauthenticated",
            "Ordering needs a guest or a customer.",
            causeOf(error),
          );
        }
        if (codes.includes("CHECKOUT__CART_EMPTY")) {
          throw fail(
            "cart_empty",
            "The cart holds nothing to order.",
            causeOf(error),
          );
        }
        if (status === 400) throw await refusal(session, error);
        throw fail(
          "backend_unavailable",
          "Shopware did not answer the order; it may have been placed.",
          causeOf(error),
        );
      }
      try {
        return await toOrder(order, [token, await session.read()]);
      } catch (error) {
        options.log("[shopware][orders] read the placed order again", {
          error: (error as Error).message,
        });
        return getOrder(session, order.id);
      }
    },

    changePaymentMethod: async (session, orderId, paymentMethodId) => {
      await ask(
        "the payment method of the order",
        () =>
          send(session, "POST", "/order/payment", { orderId, paymentMethodId }),
        { 400: "payment_method_blocked", 403: "not_found" },
      );
      return getOrder(session, orderId);
    },

    startPayment: async (session, orderId, urls) => {
      const answer = await ask(
        "the payment",
        () =>
          send<{ redirectUrl?: string | null }>(
            session,
            "POST",
            "/handle-payment",
            {
              orderId,
              finishUrl: urls.success,
              errorUrl: urls.failure,
            },
          ),
        { 403: "not_found" },
      );
      return deepFreeze({ redirectUrl: answer?.redirectUrl ?? null });
    },
  };

  const orders: OrderPort = {
    getOrder,
    listOrders: async (session, page = 1, limit = 10) => {
      const token = await session.read();
      if (!token)
        throw fail("unauthenticated", "Orders need a guest or a customer.");
      const found = await ask(
        "the orders",
        () =>
          readOrders(session, {
            page,
            limit,
            sort: [{ field: "createdAt", order: "DESC" }],
            "total-count-mode": "exact",
          }),
        { 403: "unauthenticated" },
      );
      return deepFreeze({
        orders: await Promise.all(
          found.elements.map((order) => toOrder(order, [token])),
        ),
        total: found.total,
        page,
        limit,
      });
    },
  };

  return {
    checkout,
    orders,
    visitor: {
      shop,
      send,
      toAddress,
      toCustomer,
      addressBody,
      salutationId,
      readOrderer,
      storefrontUrlFor,
    },
  };
}
