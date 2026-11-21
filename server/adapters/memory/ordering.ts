import {
  deepFreeze,
  DomainError,
  type Address,
  type Cart,
  type CheckoutSelection,
  type Id,
  type Order,
  type Orderer,
  type PaymentMethod,
  type ShippingMethod,
} from "../../../shared/domain";
import type { BackendSession, CheckoutPort, OrderPort } from "../../ports";
import type { MemoryCart } from "./cart";

type StoredOrderer = {
  customer: Orderer["customer"];
  billing: Address;
  delivery: Address;
};
type StoredOrder = { owner: string; order: Order };

const notFound = (what: string, id: Id) =>
  new DomainError("not_found", `There is no such ${what}.`, { id });

const unauthenticated = () =>
  new DomainError("unauthenticated", "Ordering needs a guest or a customer.");

/**
 * The memory checkout and orders (ADR 0001, step 5): per session token
 * the selected methods, the guest and the placed orders, so the whole
 * guest flow (menu, cart, checkout, confirmation) runs without a shop
 * backend. Orders are made from the memory cart of the same token.
 */
export function createMemoryOrdering(options: {
  shippingMethods: readonly ShippingMethod[];
  paymentMethods: readonly PaymentMethod[];
  cart: MemoryCart;
  /** The checkout switch of the shop. */
  acceptsOrders: () => boolean;
  /** At most this many sessions keep their checkout (oldest first out). */
  maxSessions?: number;
  /** The shop's country, for an address entered without one. */
  country?: string;
}): {
  checkout: Omit<CheckoutPort, "listShippingMethods">;
  orders: OrderPort;
  selectionOf: (token: string) => CheckoutSelection;
} {
  const maxSessions = options.maxSessions ?? 10_000;
  const shippingMethods = options.shippingMethods;
  const paymentMethods = deepFreeze(
    structuredClone([...options.paymentMethods]),
  );
  const defaults: CheckoutSelection = deepFreeze({
    shippingMethodId: shippingMethods[0]?.id ?? null,
    paymentMethodId:
      (paymentMethods.find((method) => method.preferred) ?? paymentMethods[0])
        ?.id ?? null,
  });
  const selections = new Map<string, CheckoutSelection>();
  const orderers = new Map<string, StoredOrderer>();
  const orders: StoredOrder[] = [];
  let nextNumber = 10000;

  const remember = <T>(map: Map<string, T>, token: string, value: T) => {
    map.delete(token);
    map.set(token, value);
    while (map.size > maxSessions) map.delete(map.keys().next().value!);
  };

  const selectionOf = (token: string) => selections.get(token) ?? defaults;

  /** The session's token, a new one for a visitor without. */
  async function tokenOf(session: BackendSession): Promise<string> {
    const token = await session.read();
    if (token) return token;
    const created = crypto.randomUUID();
    await session.write(created);
    return created;
  }

  function ordererOf(token: string | undefined): Orderer | null {
    const stored = token ? orderers.get(token) : undefined;
    return stored
      ? deepFreeze({
          customer: stored.customer,
          billingAddress: stored.billing,
          deliveryAddress: stored.delivery,
        })
      : null;
  }

  async function select(
    session: BackendSession,
    change: Partial<CheckoutSelection>,
  ): Promise<CheckoutSelection> {
    const token = await tokenOf(session);
    const next = deepFreeze({ ...selectionOf(token), ...change });
    remember(selections, token, next);
    return next;
  }

  function orderOf(token: string | undefined, orderId: Id): StoredOrder {
    const stored = orders.find(
      (entry) => entry.order.id === orderId && entry.owner === token,
    );
    if (!token || !stored) throw notFound("order", orderId);
    return stored;
  }

  function toOrder(
    cart: Cart,
    orderer: StoredOrderer,
    selection: CheckoutSelection,
    command: Parameters<CheckoutPort["placeOrder"]>[1],
  ): Order {
    const shipping = shippingMethods.find(
      (method) => method.id === selection.shippingMethodId,
    );
    const payment = paymentMethods.find(
      (method) => method.id === selection.paymentMethodId,
    );
    if (!shipping) {
      throw new DomainError(
        "shipping_method_blocked",
        "The shipping method cannot be used.",
      );
    }
    if (!payment) {
      throw new DomainError(
        "payment_method_blocked",
        "The payment method cannot be used.",
      );
    }
    const id = crypto.randomUUID().replaceAll("-", "");
    return deepFreeze({
      id,
      number: String(nextNumber++),
      placedAt: new Date().toISOString(),
      status: "open",
      paymentStatus: "open",
      fulfillment: shipping.fulfillment,
      wishedTime: command.wishedTime,
      shippingMethod: { id: shipping.id, name: shipping.name },
      paymentMethod: { id: payment.id, name: payment.name },
      lines: cart.lines.map((line, index) => ({
        id: `${id}-${index + 1}`,
        configuration: line.configuration,
        dishNumber: line.dishNumber,
        name: line.name,
        extras: line.extras.map(({ name, unitPrice }) => ({ name, unitPrice })),
        removedIngredients: line.removedIngredients,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
      })),
      discounts: cart.discounts,
      subtotal: cart.subtotal,
      shippingCosts: cart.shippingCosts,
      total: cart.total,
      taxes: cart.taxes,
      taxIncluded: true,
      billingAddress: orderer.billing,
      deliveryAddress:
        shipping.fulfillment === "pickup" ? null : orderer.delivery,
      email: orderer.customer.email,
      note: command.note,
    });
  }

  const checkout: Omit<CheckoutPort, "listShippingMethods"> = {
    listPaymentMethods: async () => paymentMethods,

    getSelection: async (session) => {
      const token = await session?.read();
      return token ? selectionOf(token) : defaults;
    },

    selectShippingMethod: async (session, methodId) => {
      if (!shippingMethods.some((method) => method.id === methodId)) {
        throw new DomainError("invalid_value", "No such shipping method.", {
          value: methodId,
        });
      }
      return select(session, { shippingMethodId: methodId });
    },

    selectPaymentMethod: async (session, methodId) => {
      if (!paymentMethods.some((method) => method.id === methodId)) {
        throw new DomainError("invalid_value", "No such payment method.", {
          value: methodId,
        });
      }
      return select(session, { paymentMethodId: methodId });
    },

    getOrderer: async (session) => ordererOf(await session.read()),

    registerGuest: async (session, guest) => {
      const token = await tokenOf(session);
      const country = options.country ?? "DE";
      const billing: Address = deepFreeze({
        id: crypto.randomUUID(),
        ...structuredClone(guest.billingAddress),
        country: guest.billingAddress.country ?? country,
      });
      const delivery: Address = guest.deliveryAddress
        ? deepFreeze({
            id: crypto.randomUUID(),
            ...structuredClone(guest.deliveryAddress),
            country: guest.deliveryAddress.country ?? country,
          })
        : billing;
      remember(orderers, token, {
        customer: deepFreeze({
          id: crypto.randomUUID(),
          guest: true,
          email: guest.email,
          salutation: guest.salutation,
          firstName: guest.firstName,
          lastName: guest.lastName,
          phone: guest.billingAddress.phone,
          defaultBillingAddressId: billing.id,
          defaultDeliveryAddressId: delivery.id,
        }),
        billing,
        delivery,
      });
      return ordererOf(token)!;
    },

    updateAddress: async (session, address) => {
      const token = await session.read();
      const stored = token ? orderers.get(token) : undefined;
      if (
        !token ||
        !stored ||
        !address.id ||
        (address.id !== stored.billing.id && address.id !== stored.delivery.id)
      ) {
        throw notFound("address", address.id ?? "");
      }
      const before =
        stored.billing.id === address.id ? stored.billing : stored.delivery;
      // a change without a salutation keeps the address's
      const changed = deepFreeze(
        structuredClone({
          ...address,
          salutation: address.salutation ?? before.salutation,
          country: address.country || before.country,
        }),
      );
      if (stored.billing.id === address.id) stored.billing = changed;
      if (stored.delivery.id === address.id) stored.delivery = changed;
      return ordererOf(token)!;
    },

    placeOrder: async (session, command) => {
      const token = await session.read();
      const orderer = token ? orderers.get(token) : undefined;
      if (!token || !orderer) throw unauthenticated();
      const cart = options.cart.cartOf(token);
      if (!cart.lines.length) {
        throw new DomainError("cart_empty", "The cart holds nothing to order.");
      }
      if (!options.acceptsOrders()) {
        throw new DomainError(
          "ordering_closed",
          "The restaurant does not take orders now.",
        );
      }
      const order = toOrder(cart, orderer, selectionOf(token), command);
      orders.push({ owner: token, order });
      options.cart.clear(token);
      return order;
    },

    changePaymentMethod: async (session, orderId, paymentMethodId) => {
      const stored = orderOf(await session.read(), orderId);
      const payment = paymentMethods.find(
        (method) => method.id === paymentMethodId,
      );
      if (!payment) {
        throw new DomainError(
          "payment_method_blocked",
          "The payment method cannot be used.",
        );
      }
      stored.order = deepFreeze({
        ...stored.order,
        paymentMethod: { id: payment.id, name: payment.name },
      });
      return stored.order;
    },

    startPayment: async (session, orderId) => {
      orderOf(await session.read(), orderId);
      return deepFreeze({ redirectUrl: null });
    },
  };

  const orderPort: OrderPort = {
    getOrder: async (session, orderId) =>
      orderOf(await session.read(), orderId).order,

    listOrders: async (session, page = 1, limit = 10) => {
      const token = await session.read();
      if (!token || !orderers.has(token)) throw unauthenticated();
      const own = orders
        .filter((entry) => entry.owner === token)
        .map((entry) => entry.order)
        .reverse();
      return deepFreeze({
        orders: own.slice((page - 1) * limit, page * limit),
        total: own.length,
        page,
        limit,
      });
    },
  };

  return { checkout, orders: orderPort, selectionOf };
}
