import {
  createMemoryBackend,
  type MemorySeed,
} from "../../server/adapters/memory";
import { createShopwareBackend } from "../../server/adapters/shopware";
import { leadTime } from "../../shared/domain";
import {
  fakeShopwareCart,
  httpError,
  memoryCartSeed,
  type FakeStoreApiExtension,
  type Json,
} from "./cartFixtures";
import type { BackendFixture, OrderingScenario } from "./ordering.contract";

/** The memory seed of an ordering scenario. */
export function memoryOrderingSeed(scenario: OrderingScenario): MemorySeed {
  const seed = memoryCartSeed(scenario.cart);
  return {
    ...seed,
    shop: {
      ...seed.shop,
      config: {
        ...seed.shop.config,
        acceptsOrders: !scenario.orderingClosed,
      },
    },
    checkout: {
      shippingMethods: scenario.shippingMethods.map((method) => ({
        id: method.id,
        name: method.name,
        description: method.description,
        fulfillment: method.fulfillment,
        leadTime:
          method.leadTimeMinutes === null
            ? null
            : leadTime(method.leadTimeMinutes),
        media: null,
      })),
      paymentMethods: scenario.paymentMethods.map((method) => ({
        ...method,
        media: null,
        redirects: false,
      })),
    },
  };
}

/** The memory adapter with the scenario's menu, methods and switch. */
export const memoryOrdering: BackendFixture<OrderingScenario> = {
  adapter: "memory",
  create: (scenario) => createMemoryBackend(memoryOrderingSeed(scenario)),
};

/* ------------------------------------------------------------------ */
/* Shopware: the cart fake plus context, guest customers and orders     */
/* ------------------------------------------------------------------ */

export const GERMANY = "f0e1d2c3b4a54968a7b6c5d4e3f2a1b0";
const AUSTRIA = "a1b2c3d4e5f64a7b8c9d0e1f2a3b4c5d";
export const MR = "b2c3d4e5f6a74b8c9d0e1f2a3b4c5d6e";
export const MRS = "c3d4e5f6a7b84c9d0e1f2a3b4c5d6e7f";
/** The instant every fake order is placed at (17:00 in Berlin). */
export const PLACED_AT = "2026-11-21T16:00:00.000+00:00";

export type FakeAddress = Json & { id: string };
export type FakeCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  billing: FakeAddress;
  shipping: FakeAddress;
  /** Guest customers unless false (an account). */
  guest?: boolean;
  salutationId?: string;
};
type Selection = { shippingMethodId: string; paymentMethodId: string };

/**
 * A fake of the Store API with the ShopBite plugin for the ordering
 * contract: the context (methods, sales channel), guest registration
 * (`/account/register` replaces the token and keeps the cart), the
 * customer and its addresses, `/checkout/order` (403 without customer,
 * `CHECKOUT__CART_EMPTY`, the plugin's `shopbite-ordering-paused`), the
 * customer's orders, the payment.
 */
export function fakeShopwareOrdering(
  scenario: OrderingScenario,
  /** More of the Store API, asked first (the account). */
  extra: FakeStoreApiExtension = {},
) {
  const selections = new Map<string, Selection>();
  const customers = new Map<string, FakeCustomer>();
  const orders: { owner: string; json: Json }[] = [];
  let ids = 0;
  let numbers = 10000;
  const nextId = () => (++ids).toString(16).padStart(32, "0");
  const defaults: Selection = {
    shippingMethodId: scenario.shippingMethods[0]?.id ?? "",
    paymentMethodId:
      (
        scenario.paymentMethods.find((method) => method.preferred) ??
        scenario.paymentMethods[0]
      )?.id ?? "",
  };
  const preferred = defaults.paymentMethodId;
  const selectionOf = (token: string) => selections.get(token) ?? defaults;
  const shipping = (id: string) =>
    scenario.shippingMethods.find((method) => method.id === id);
  const payment = (id: string) =>
    scenario.paymentMethods.find((method) => method.id === id);

  const contextJson = (token?: string): Json => {
    const selection = token ? selectionOf(token) : defaults;
    return {
      token: token ?? "a-new-context-token",
      currency: { isoCode: "EUR" },
      shippingMethod: { id: selection.shippingMethodId },
      paymentMethod: { id: selection.paymentMethodId },
      salesChannel: {
        paymentMethodId: preferred,
        domains: [{ url: "https://shop.example.com", languageId: "de" }],
      },
      context: { languageIdChain: ["de"] },
    };
  };

  const salutationOf = (id: unknown) =>
    id === MR
      ? { salutationKey: "mr" }
      : id === MRS
        ? { salutationKey: "mrs" }
        : null;

  const addressJson = (address: FakeAddress): Json => ({
    ...address,
    country: {
      iso:
        address.countryId === GERMANY
          ? "DE"
          : address.countryId === AUSTRIA
            ? "AT"
            : "XX",
    },
    salutation: salutationOf(address.salutationId),
  });

  const customerJson = (customer: FakeCustomer): Json => ({
    id: customer.id,
    guest: customer.guest ?? true,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    salutation: salutationOf(customer.salutationId),
    defaultBillingAddressId: customer.billing.id,
    defaultShippingAddressId: customer.shipping.id,
    defaultBillingAddress: addressJson(customer.billing),
    defaultShippingAddress: addressJson(customer.shipping),
  });

  const paymentMethodJson = (
    method: OrderingScenario["paymentMethods"][number],
  ) => ({
    id: method.id,
    name: method.name,
    description: method.description,
    translated: { name: method.name, description: method.description },
    media: null,
  });

  function orderJson(
    token: string,
    customer: FakeCustomer,
    cart: Json,
    comment: string,
  ): Json {
    const selection = selectionOf(token);
    const method = shipping(selection.shippingMethodId)!;
    const pay = payment(selection.paymentMethodId)!;
    const id = nextId();
    const billingId = nextId();
    const items: Json[] = [];
    let position = 0;
    for (const item of cart.lineItems as Json[]) {
      const price = item.price as { unitPrice: number; totalPrice: number };
      items.push({
        id: item.id,
        parentId: null,
        type: item.type,
        referencedId: item.referencedId,
        label: item.label,
        quantity: item.quantity,
        unitPrice: price.unitPrice,
        totalPrice: price.totalPrice,
        payload: item.payload,
        position: ++position,
      });
      for (const child of (item.children as Json[] | undefined) ?? []) {
        const childPrice = child.price as {
          unitPrice: number;
          totalPrice: number;
        };
        items.push({
          id: `${item.id as string}-${child.id as string}`,
          parentId: item.id,
          type: child.type,
          referencedId: child.referencedId,
          label: child.label,
          quantity: child.quantity,
          unitPrice: childPrice.unitPrice,
          totalPrice: childPrice.totalPrice,
          payload: child.payload,
          position: ++position,
        });
      }
    }
    const price = cart.price as { positionPrice: number; totalPrice: number };
    return {
      id,
      orderNumber: String(numbers++),
      orderDateTime: PLACED_AT,
      createdAt: PLACED_AT,
      customerComment: comment,
      amountTotal: price.totalPrice,
      shippingTotal: 0,
      positionPrice: price.positionPrice,
      taxStatus: "gross",
      price: {
        positionPrice: price.positionPrice,
        totalPrice: price.totalPrice,
        taxStatus: "gross",
        calculatedTaxes: [],
      },
      stateMachineState: { technicalName: "open" },
      billingAddressId: billingId,
      addresses: [addressJson({ ...customer.billing, id: billingId })],
      orderCustomer: { email: customer.email },
      lineItems: items,
      deliveries: [
        {
          shippingMethodId: method.id,
          shippingMethod: {
            id: method.id,
            name: method.name,
            translated: {
              name: method.name,
              customFields: { shopbite_fulfillment: method.fulfillment },
            },
            customFields: { shopbite_fulfillment: method.fulfillment },
          },
          shippingOrderAddress: addressJson({
            ...customer.shipping,
            id: nextId(),
          }),
        },
      ],
      transactions: [
        {
          createdAt: PLACED_AT,
          paymentMethodId: pay.id,
          paymentMethod: {
            id: pay.id,
            name: pay.name,
            translated: { name: pay.name },
          },
          stateMachineState: { technicalName: "open" },
        },
      ],
    };
  }

  const pausedError = {
    "shopbite-ordering-paused": {
      key: "shopbite-ordering-paused",
      messageKey: "shopbite-ordering-paused",
      level: 20,
      message: "Ordering is paused.",
    },
  };

  const fake = fakeShopwareCart(scenario.cart, {
    decorate: (token, cart, lines) => {
      if (!lines.length) return;
      const selection = selectionOf(token);
      cart.deliveries = [
        {
          shippingCosts: { totalPrice: 0 },
          shippingMethod: { id: selection.shippingMethodId },
        },
      ];
      cart.transactions = [{ paymentMethodId: selection.paymentMethodId }];
      if (scenario.orderingClosed) {
        cart.errors = { ...(cart.errors as Json), ...pausedError };
      }
    },
    visitor: (request, state) => {
      const extended = extra.visitor?.(request, state);
      if (extended) return extended;
      const { method, path, body } = request;
      const { token, lines, carts, cart } = state;
      const customer = customers.get(token);
      if (method === "GET" && path === "/context") {
        return { data: contextJson(token) };
      }
      if (method === "PATCH" && path === "/context") {
        const change = body as Partial<Selection>;
        if (change.shippingMethodId && !shipping(change.shippingMethodId)) {
          throw httpError(400, "CHECKOUT__SHIPPING_METHOD_NOT_FOUND");
        }
        if (change.paymentMethodId && !payment(change.paymentMethodId)) {
          throw httpError(400, "CHECKOUT__UNKNOWN_PAYMENT_METHOD");
        }
        selections.set(token, { ...selectionOf(token), ...change });
        return { data: { contextToken: token } };
      }
      if (method === "POST" && path === "/payment-method") {
        return {
          data: { elements: scenario.paymentMethods.map(paymentMethodJson) },
        };
      }
      if (method === "POST" && path === "/account/register") {
        const input = body as Json;
        const billing = input.billingAddress as Json;
        const shippingInput = input.shippingAddress as Json | undefined;
        const billingAddress = { ...billing, id: nextId() };
        const shippingAddress = shippingInput
          ? { ...shippingInput, id: nextId() }
          : billingAddress;
        // Shopware replaces the token and keeps the cart
        const next = `context-guest-${nextId()}`;
        carts.set(next, lines);
        carts.delete(token);
        if (selections.has(token)) selections.set(next, selectionOf(token));
        customers.set(next, {
          id: nextId(),
          email: input.email as string,
          firstName: input.firstName as string,
          lastName: input.lastName as string,
          billing: billingAddress,
          shipping: shippingAddress,
        });
        return {
          data: { id: customers.get(next)!.id, guest: true },
          contextToken: next,
        };
      }
      if (method === "POST" && path === "/account/customer") {
        if (!customer) throw httpError(403, "CHECKOUT__CUSTOMER_NOT_LOGGED_IN");
        return { data: customerJson(customer) };
      }
      const addressPath = path.match(/^\/account\/address\/([^/]+)$/);
      if (method === "PATCH" && addressPath) {
        if (!customer) throw httpError(403, "CHECKOUT__CUSTOMER_NOT_LOGGED_IN");
        const id = addressPath[1]!;
        if (customer.billing.id !== id && customer.shipping.id !== id) {
          throw httpError(404, "CHECKOUT__CUSTOMER_ADDRESS_NOT_FOUND");
        }
        // a PATCH changes the fields it sends
        const before =
          customer.billing.id === id ? customer.billing : customer.shipping;
        const changed = { ...before, ...(body as Json), id } as FakeAddress;
        if (customer.billing.id === id) customer.billing = changed;
        if (customer.shipping.id === id) customer.shipping = changed;
        return { data: changed };
      }
      if (method === "POST" && path === "/checkout/order") {
        if (!customer) throw httpError(403, "CHECKOUT__CUSTOMER_NOT_LOGGED_IN");
        if (!lines.length) throw httpError(400, "CHECKOUT__CART_EMPTY");
        if (scenario.orderingClosed)
          throw httpError(400, "CHECKOUT__CART_INVALID");
        const json = orderJson(
          token,
          customer,
          cart(),
          (body as Json).customerComment as string,
        );
        orders.push({ owner: customer.id, json });
        lines.splice(0, lines.length);
        return { data: json };
      }
      if (method === "POST" && path === "/order") {
        if (!customer) throw httpError(403, "CHECKOUT__CUSTOMER_NOT_LOGGED_IN");
        const criteria = body as Json;
        const own = orders
          .filter((entry) => entry.owner === customer.id)
          .map((entry) => entry.json)
          .reverse();
        const wanted = criteria.ids
          ? own.filter((order) =>
              (criteria.ids as string[]).includes(order.id as string),
            )
          : own;
        const page = (criteria.page as number | undefined) ?? 1;
        const limit = (criteria.limit as number | undefined) ?? 10;
        return {
          data: {
            orders: {
              elements: wanted.slice((page - 1) * limit, page * limit),
              total: wanted.length,
            },
          },
        };
      }
      if (method === "POST" && path === "/handle-payment") {
        if (!customer) throw httpError(403, "CHECKOUT__CUSTOMER_NOT_LOGGED_IN");
        return { data: { redirectUrl: null } };
      }
      if (method === "POST" && path === "/order/payment") {
        if (!customer) throw httpError(403, "CHECKOUT__CUSTOMER_NOT_LOGGED_IN");
        const { orderId, paymentMethodId } = body as Record<string, string>;
        const entry = orders.find(
          (order) => order.json.id === orderId && order.owner === customer.id,
        );
        const method = payment(paymentMethodId!);
        if (!entry) throw httpError(404, "CHECKOUT__ORDER_NOT_FOUND");
        if (!method) throw httpError(400, "CHECKOUT__UNKNOWN_PAYMENT_METHOD");
        entry.json = {
          ...entry.json,
          transactions: [
            ...(entry.json.transactions as Json[]),
            {
              createdAt: "2026-11-21T16:05:00.000+00:00",
              paymentMethodId: method.id,
              paymentMethod: {
                id: method.id,
                name: method.name,
                translated: { name: method.name },
              },
              stateMachineState: { technicalName: "open" },
            },
          ],
        };
        return { data: { success: true } };
      }
      return undefined;
    },
    shopGet: (path) => (path === "/context" ? contextJson() : undefined),
    shopPost: (path, body, headers) => {
      const extended = extra.shopPost?.(path, body, headers);
      if (extended !== undefined) return extended;
      if (path === "/payment-method") {
        return { elements: scenario.paymentMethods.map(paymentMethodJson) };
      }
      if (path === "/country") {
        // Shopware's Store API refuses a limit above 100
        if (((body?.limit as number | undefined) ?? 0) > 100) {
          throw httpError(400, "FRAMEWORK__QUERY_LIMIT_EXCEEDED");
        }
        const countries = [
          { id: GERMANY, iso: "DE" },
          { id: AUSTRIA, iso: "AT" },
        ];
        const iso = (
          (body?.filter as { field?: string; value?: string }[] | undefined) ??
          []
        ).find((filter) => filter.field === "iso")?.value;
        return {
          elements: countries.filter((country) => !iso || country.iso === iso),
        };
      }
      if (path === "/salutation") {
        return {
          elements: [
            { id: MR, salutationKey: "mr" },
            { id: MRS, salutationKey: "mrs" },
          ],
        };
      }
      return undefined;
    },
  });
  return {
    ...fake,
    customers,
    orders,
    selections,
    nextId,
    addressJson,
    customerJson,
  };
}

export const shopwareOrdering: BackendFixture<OrderingScenario> = {
  adapter: "shopware",
  create: (scenario) => {
    const fake = fakeShopwareOrdering(scenario);
    return createShopwareBackend({
      storeApi: fake.storeApi,
      visitorApi: fake.visitorApi,
      // `public.site.countryId`: the shop's country
      countryId: GERMANY,
      storeUrl: "https://shop.example.com",
      timeZone: "Europe/Berlin",
      log: () => {},
    });
  },
};
