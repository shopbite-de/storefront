import { describe, expect, it } from "vitest";
import {
  dishConfiguration,
  isDomainError,
  wishedTime,
  type Address,
  type GuestDetails,
  type Order,
} from "../../shared/domain";
import type { Backend, PlaceOrderCommand } from "../../server/ports";
import {
  CHEESE,
  COLA,
  LARGE,
  MARGHERITA,
  PIZZERIA,
  SALAMI,
  TOMATO,
  testSession,
  type CartScenario,
} from "./cart.contract";
import type { ShippingMethodScenario } from "./checkout.contract";

/**
 * Ordering (ADR 0001, step 5): the visitor's checkout (selected methods,
 * who orders, placing the order, payment) and the placed orders, on one
 * backend, since an order is made from the cart the same backend holds.
 */
export type OrderingScenario = Readonly<{
  cart: CartScenario;
  /** In the shop's order; the first one is selected for a new visitor. */
  shippingMethods: readonly ShippingMethodScenario[];
  /** In the shop's order; `preferred` is the shop's default. */
  paymentMethods: readonly Readonly<{
    id: string;
    name: string;
    description: string | null;
    preferred: boolean;
  }>[];
  /** The backend refuses every order (ordering paused). */
  orderingClosed?: boolean;
}>;

export type BackendFixture<Scenario> = Readonly<{
  adapter: string;
  create: (scenario: Scenario) => Backend | Promise<Backend>;
}>;

export const DELIVERY = "c1d2e3f4a5b64c7d8e9f0a1b2c3d4e5f";
export const PICKUP = "d2e3f4a5b6c74d8e9f0a1b2c3d4e5f6a";
export const CASH = "e3f4a5b6c7d84e9f0a1b2c3d4e5f6a7b";
export const CARD = "f4a5b6c7d8e94f0a1b2c3d4e5f6a7b8c";

export const RESTAURANT: OrderingScenario = {
  cart: PIZZERIA,
  shippingMethods: [
    {
      id: DELIVERY,
      name: "Lieferung",
      description: null,
      fulfillment: "delivery",
      leadTimeMinutes: 30,
    },
    {
      id: PICKUP,
      name: "Abholung",
      description: null,
      fulfillment: "pickup",
      leadTimeMinutes: 15,
    },
  ],
  paymentMethods: [
    {
      id: CASH,
      name: "Barzahlung",
      description: "Bar bei Übergabe",
      preferred: true,
    },
    { id: CARD, name: "Kartenzahlung", description: null, preferred: false },
  ],
};

const address = (
  overrides: Partial<Omit<Address, "id">> = {},
): Omit<Address, "id"> => ({
  salutation: null,
  firstName: "Max",
  lastName: "Muster",
  company: null,
  department: null,
  street: "Musterstraße 1",
  additionalLine: null,
  postalCode: "12345",
  city: "Musterstadt",
  country: "DE",
  phone: "0123456789",
  ...overrides,
});

export const GUEST: GuestDetails = {
  email: "max@example.com",
  salutation: null,
  firstName: "Max",
  lastName: "Muster",
  business: false,
  billingAddress: address(),
  deliveryAddress: null,
};

export const STOREFRONT_URL = "https://shop.example.com";

/** 18:40 on the day the scenario's orders are placed. */
export const WISHED = wishedTime("2026-11-21", "18:40");

const command = (
  overrides: Partial<PlaceOrderCommand> = {},
): PlaceOrderCommand => ({
  wishedTime: WISHED,
  fulfillment: "delivery",
  note: null,
  ...overrides,
});

async function rejection(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call();
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to fail");
}

const euros = (value: { amountMinor: number }) => value.amountMinor / 100;

/** A guest with a cart: a configured Margherita, a large Salami, two colas. */
async function guestWithCart(backend: Backend, guest: GuestDetails = GUEST) {
  const session = testSession();
  await backend.cart.addLine(
    session,
    dishConfiguration({
      dishId: MARGHERITA,
      extraIds: [CHEESE],
      removedIngredientIds: [TOMATO],
    }),
    1,
  );
  await backend.cart.addLine(
    session,
    dishConfiguration({ dishId: SALAMI, variantId: LARGE }),
    1,
  );
  await backend.cart.addLine(session, dishConfiguration({ dishId: COLA }), 2);
  await backend.checkout.registerGuest(session, guest, STOREFRONT_URL);
  return session;
}

const lineSummary = (order: Order) =>
  order.lines.map((line) => ({
    dish: line.configuration.dishId,
    variant: line.configuration.variantId,
    extraIds: line.configuration.extraIds,
    removedIds: line.configuration.removedIngredientIds,
    number: line.dishNumber,
    name: line.name,
    extras: line.extras.map((extra) => [extra.name, euros(extra.unitPrice)]),
    removed: line.removedIngredients,
    quantity: line.quantity,
    unit: euros(line.unitPrice),
    total: euros(line.totalPrice),
  }));

export function runOrderingContract(
  fixtures: readonly BackendFixture<OrderingScenario>[],
): void {
  for (const fixture of fixtures) {
    describe(`ordering contract [${fixture.adapter}]`, () => {
      const given = async (scenario: OrderingScenario = RESTAURANT) =>
        fixture.create(scenario);
      orderingSuite(given);
    });
  }
}

function orderingSuite(
  given: (scenario?: OrderingScenario) => Promise<Backend>,
): void {
  describe("methods", () => {
    it("gives a new visitor the shop's default methods without a session", async () => {
      const backend = await given();
      const session = testSession();
      expect(await backend.checkout.getSelection(session)).toEqual({
        shippingMethodId: DELIVERY,
        paymentMethodId: CASH,
      });
      expect(await backend.checkout.getSelection()).toEqual({
        shippingMethodId: DELIVERY,
        paymentMethodId: CASH,
      });
      expect(session.state()).toBeUndefined();
    });

    it("selects shipping and payment methods for this visitor only", async () => {
      const backend = await given();
      const visitor = testSession();
      const other = testSession();
      await backend.cart.addLine(other, dishConfiguration({ dishId: COLA }), 1);
      expect(
        await backend.checkout.selectShippingMethod(visitor, PICKUP),
      ).toEqual({ shippingMethodId: PICKUP, paymentMethodId: CASH });
      expect(await backend.checkout.selectPaymentMethod(visitor, CARD)).toEqual(
        { shippingMethodId: PICKUP, paymentMethodId: CARD },
      );
      expect(await backend.checkout.getSelection(visitor)).toEqual({
        shippingMethodId: PICKUP,
        paymentMethodId: CARD,
      });
      expect(await backend.checkout.getSelection(other)).toEqual({
        shippingMethodId: DELIVERY,
        paymentMethodId: CASH,
      });
      // the cart follows the selection
      const cart = await backend.cart.addLine(
        visitor,
        dishConfiguration({ dishId: COLA }),
        1,
      );
      expect(cart.shippingMethodId).toBe(PICKUP);
      expect(cart.paymentMethodId).toBe(CARD);
    });

    it("refuses a method the shop does not have", async () => {
      const backend = await given();
      const error = await rejection(() =>
        backend.checkout.selectShippingMethod(
          testSession(),
          "00000000000000000000000000000000",
        ),
      );
      expect(isDomainError(error, "invalid_value")).toBe(true);
      const payment = await rejection(() =>
        backend.checkout.selectPaymentMethod(
          testSession(),
          "00000000000000000000000000000000",
        ),
      );
      expect(isDomainError(payment, "invalid_value")).toBe(true);
    });

    it("lists the payment methods in the shop's order with its default", async () => {
      const backend = await given();
      const methods = await backend.checkout.listPaymentMethods(testSession());
      expect(
        methods.map(({ id, name, description, preferred, redirects }) => ({
          id,
          name,
          description,
          preferred,
          redirects,
        })),
      ).toEqual([
        {
          id: CASH,
          name: "Barzahlung",
          description: "Bar bei Übergabe",
          preferred: true,
          redirects: false,
        },
        {
          id: CARD,
          name: "Kartenzahlung",
          description: null,
          preferred: false,
          redirects: false,
        },
      ]);
      expect(
        (await backend.checkout.listPaymentMethods()).map((m) => m.name),
      ).toEqual(["Barzahlung", "Kartenzahlung"]);
    });
  });

  describe("guest", () => {
    it("has no orderer before the guest's details are known", async () => {
      const backend = await given();
      expect(await backend.checkout.getOrderer(testSession())).toBeNull();
    });

    it("makes the visitor a guest who keeps the cart", async () => {
      const backend = await given();
      const session = testSession();
      await backend.cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        1,
      );
      const orderer = await backend.checkout.registerGuest(
        session,
        GUEST,
        STOREFRONT_URL,
      );
      expect(orderer.customer).toMatchObject({
        guest: true,
        email: "max@example.com",
        firstName: "Max",
        lastName: "Muster",
      });
      const { id, ...billing } = orderer.billingAddress;
      expect(id).toBeTruthy();
      expect(billing).toEqual(address());
      // one address for billing and delivery
      expect(orderer.deliveryAddress).toEqual(orderer.billingAddress);
      expect(await backend.checkout.getOrderer(session)).toEqual(orderer);
      expect((await backend.cart.getCart(session)).lines).toHaveLength(1);
      expect(await backend.checkout.getOrderer(testSession())).toBeNull();
    });

    it("keeps a business address and another delivery address", async () => {
      const backend = await given();
      const session = testSession();
      const orderer = await backend.checkout.registerGuest(
        session,
        {
          ...GUEST,
          business: true,
          billingAddress: address({
            company: "Muster GmbH",
            department: "Einkauf",
            additionalLine: "3. OG",
          }),
          deliveryAddress: address({
            firstName: "Erika",
            street: "Nebenweg 2",
            phone: "0987654321",
          }),
        },
        STOREFRONT_URL,
      );
      expect(orderer.billingAddress).toMatchObject({
        company: "Muster GmbH",
        department: "Einkauf",
        additionalLine: "3. OG",
      });
      expect(orderer.deliveryAddress).toMatchObject({
        firstName: "Erika",
        street: "Nebenweg 2",
        phone: "0987654321",
      });
      expect(orderer.deliveryAddress.id).not.toBe(orderer.billingAddress.id);
    });

    it("changes an address of the orderer, not one of another", async () => {
      const backend = await given();
      const session = testSession();
      const orderer = await backend.checkout.registerGuest(
        session,
        GUEST,
        STOREFRONT_URL,
      );
      const changed = await backend.checkout.updateAddress(session, {
        ...orderer.billingAddress,
        street: "Neue Straße 5",
        phone: "0111222333",
      });
      expect(changed.billingAddress.street).toBe("Neue Straße 5");
      expect(changed.billingAddress.phone).toBe("0111222333");
      expect(changed.billingAddress.id).toBe(orderer.billingAddress.id);

      const other = testSession();
      await backend.checkout.registerGuest(other, GUEST, STOREFRONT_URL);
      const error = await rejection(() =>
        backend.checkout.updateAddress(other, orderer.billingAddress),
      );
      expect(isDomainError(error, "not_found")).toBe(true);
    });
  });

  describe("addresses", () => {
    it("keeps a salutation that a change sets, and one it leaves out", async () => {
      const backend = await given();
      const session = testSession();
      const orderer = await backend.checkout.registerGuest(
        session,
        GUEST,
        STOREFRONT_URL,
      );
      const set = await backend.checkout.updateAddress(session, {
        ...orderer.billingAddress,
        salutation: "mr",
      });
      expect(set.billingAddress.salutation).toBe("mr");
      const kept = await backend.checkout.updateAddress(session, {
        ...set.billingAddress,
        salutation: null,
        street: "Neue Straße 5",
      });
      expect(kept.billingAddress.salutation).toBe("mr");
      expect(kept.billingAddress.street).toBe("Neue Straße 5");
    });

    it("puts an address without a country in the shop's country", async () => {
      const backend = await given();
      const orderer = await backend.checkout.registerGuest(
        testSession(),
        {
          ...GUEST,
          billingAddress: { ...GUEST.billingAddress, country: null },
        },
        STOREFRONT_URL,
      );
      expect(orderer.billingAddress.country).toBe("DE");
    });
  });

  describe("placing an order", () => {
    it("places the cart with its dish configurations, prices and wished time", async () => {
      const backend = await given();
      const session = await guestWithCart(backend);
      await backend.checkout.selectShippingMethod(session, PICKUP);
      await backend.cart.applyVoucher(session, "WILLKOMMEN");

      const order = await backend.checkout.placeOrder(
        session,
        command({ fulfillment: "pickup" }),
      );

      expect(order.number).toMatch(/\S/);
      expect(Number.isNaN(Date.parse(order.placedAt))).toBe(false);
      expect(order.status).toBe("open");
      expect(order.paymentStatus).toBe("open");
      expect(order.fulfillment).toBe("pickup");
      expect(order.wishedTime).toEqual(WISHED);
      expect(order.note).toBeNull();
      expect(order.shippingMethod).toEqual({ id: PICKUP, name: "Abholung" });
      expect(order.paymentMethod).toEqual({ id: CASH, name: "Barzahlung" });
      expect(order.email).toBe("max@example.com");
      expect(order.billingAddress).toMatchObject(address());
      expect(order.deliveryAddress).toBeNull();
      expect(lineSummary(order)).toEqual([
        {
          dish: MARGHERITA,
          variant: null,
          extraIds: [CHEESE],
          removedIds: [TOMATO],
          number: "21",
          name: "Pizza Margherita",
          extras: [["Extra Käse", 1.5]],
          removed: ["Tomaten"],
          quantity: 1,
          unit: 11,
          total: 11,
        },
        {
          dish: SALAMI,
          variant: LARGE,
          extraIds: [],
          removedIds: [],
          number: "22G",
          name: "Pizza Salami",
          extras: [],
          removed: [],
          quantity: 1,
          unit: 12.5,
          total: 12.5,
        },
        {
          dish: COLA,
          variant: null,
          extraIds: [],
          removedIds: [],
          number: "80",
          name: "Cola 0,33 l",
          extras: [],
          removed: [],
          quantity: 2,
          unit: 3,
          total: 6,
        },
      ]);
      expect(
        order.discounts.map((discount) => [
          discount.code,
          euros(discount.amount),
        ]),
      ).toEqual([["WILLKOMMEN", -2]]);
      expect(euros(order.subtotal)).toBe(27.5);
      expect(euros(order.total)).toBe(27.5 + euros(order.shippingCosts));
      expect(order.total.currency).toBe("EUR");
      expect(order.taxIncluded).toBe(true);

      // the cart is empty afterwards
      expect((await backend.cart.getCart(session)).lines).toEqual([]);
    });

    it("delivers to the guest's delivery address", async () => {
      const backend = await given();
      const session = await guestWithCart(backend, {
        ...GUEST,
        deliveryAddress: address({ street: "Nebenweg 2" }),
      });
      const order = await backend.checkout.placeOrder(session, command());
      expect(order.fulfillment).toBe("delivery");
      expect(order.shippingMethod.id).toBe(DELIVERY);
      expect(order.deliveryAddress?.street).toBe("Nebenweg 2");
      expect(order.billingAddress.street).toBe("Musterstraße 1");
    });

    it("keeps the guest's note apart from the wished time", async () => {
      const backend = await given();
      const session = await guestWithCart(backend);
      const order = await backend.checkout.placeOrder(
        session,
        command({ note: "Bitte klingeln" }),
      );
      expect(order.wishedTime).toEqual(WISHED);
      expect(order.note).toBe("Bitte klingeln");
    });

    it("refuses an empty cart", async () => {
      const backend = await given();
      const session = testSession();
      await backend.checkout.registerGuest(session, GUEST, STOREFRONT_URL);
      const error = await rejection(() =>
        backend.checkout.placeOrder(session, command()),
      );
      expect(isDomainError(error, "cart_empty")).toBe(true);
    });

    it("needs a guest or customer", async () => {
      const backend = await given();
      const session = testSession();
      await backend.cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        1,
      );
      const error = await rejection(() =>
        backend.checkout.placeOrder(session, command()),
      );
      expect(isDomainError(error, "unauthenticated")).toBe(true);
      expect((await backend.cart.getCart(session)).lines).toHaveLength(1);
    });

    it("reports that the restaurant does not take orders and keeps the cart", async () => {
      const backend = await given({ ...RESTAURANT, orderingClosed: true });
      const session = await guestWithCart(backend);
      const error = await rejection(() =>
        backend.checkout.placeOrder(session, command()),
      );
      expect(isDomainError(error, "ordering_closed")).toBe(true);
      expect((await backend.cart.getCart(session)).lines).toHaveLength(3);
      const orders = await backend.orders.listOrders(session);
      expect(orders.total).toBe(0);
    });

    it("starts the payment of a method without redirect", async () => {
      const backend = await given();
      const session = await guestWithCart(backend);
      const order = await backend.checkout.placeOrder(session, command());
      expect(
        await backend.checkout.startPayment(session, order.id, {
          success: `${STOREFRONT_URL}/bestellung/${order.id}/erfolg`,
          failure: `${STOREFRONT_URL}/bestellung/${order.id}/fehler`,
        }),
      ).toEqual({ redirectUrl: null });
    });

    it("switches the payment method of a placed order", async () => {
      const backend = await given();
      const session = await guestWithCart(backend);
      const order = await backend.checkout.placeOrder(session, command());
      const changed = await backend.checkout.changePaymentMethod(
        session,
        order.id,
        CARD,
      );
      expect(changed.paymentMethod).toEqual({
        id: CARD,
        name: "Kartenzahlung",
      });
      expect(changed.id).toBe(order.id);
    });

    it("answers values a caller cannot change", async () => {
      const backend = await given();
      const session = await guestWithCart(backend);
      const order = await backend.checkout.placeOrder(session, command());
      expect(Object.isFrozen(order)).toBe(true);
      expect(Object.isFrozen(order.lines[0])).toBe(true);
      expect(Object.isFrozen(order.lines[0]?.configuration)).toBe(true);
      const orderer = await backend.checkout.getOrderer(session);
      expect(Object.isFrozen(orderer)).toBe(true);
      expect(
        Object.isFrozen(await backend.checkout.listPaymentMethods(session)),
      ).toBe(true);
    });
  });

  describe("orders", () => {
    it("opens the session's order by id, never another visitor's", async () => {
      const backend = await given();
      const session = await guestWithCart(backend);
      const placed = await backend.checkout.placeOrder(session, command());

      const read = await backend.orders.getOrder(session, placed.id);
      expect(read).toEqual(placed);

      const stranger = await guestWithCart(backend, {
        ...GUEST,
        email: "erika@example.com",
      });
      const foreign = await rejection(() =>
        backend.orders.getOrder(stranger, placed.id),
      );
      expect(isDomainError(foreign, "not_found")).toBe(true);
      const visitor = await rejection(() =>
        backend.orders.getOrder(testSession(), placed.id),
      );
      expect(isDomainError(visitor, "not_found")).toBe(true);
      const unknown = await rejection(() =>
        backend.orders.getOrder(session, "0123456789abcdef0123456789abcdef"),
      );
      expect(isDomainError(unknown, "not_found")).toBe(true);
    });

    it("lists the session's orders, newest first", async () => {
      const backend = await given();
      const session = await guestWithCart(backend);
      const first = await backend.checkout.placeOrder(session, command());
      await backend.cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        1,
      );
      const second = await backend.checkout.placeOrder(session, command());

      const page = await backend.orders.listOrders(session, 1, 10);
      expect(page.total).toBe(2);
      expect(page.orders.map((order) => order.id)).toEqual([
        second.id,
        first.id,
      ]);
      expect(first.number).not.toBe(second.number);
      const newest = await backend.orders.listOrders(session, 1, 1);
      expect(newest.orders.map((order) => order.id)).toEqual([second.id]);
    });

    it("lists no orders without a guest or customer", async () => {
      const backend = await given();
      const error = await rejection(() =>
        backend.orders.listOrders(testSession()),
      );
      expect(isDomainError(error, "unauthenticated")).toBe(true);
    });
  });
}
