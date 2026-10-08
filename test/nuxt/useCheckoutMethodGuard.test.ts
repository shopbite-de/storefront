import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import {
  useCheckoutMethodGuard,
  hasBlockedShippingMethod,
  hasBlockedPaymentMethod,
  getCartErrors,
} from "~/composables/useCheckoutMethodGuard";
import type { Schemas } from "#shopware";

const {
  mockRefreshCart,
  mockGetShippingMethods,
  mockSetShippingMethod,
  mockGetPaymentMethods,
  mockSetPaymentMethod,
} = vi.hoisted(() => ({
  mockRefreshCart: vi.fn(),
  mockGetShippingMethods: vi.fn(),
  mockSetShippingMethod: vi.fn(),
  mockGetPaymentMethods: vi.fn(),
  mockSetPaymentMethod: vi.fn(),
}));

// Reactive state shared with the mocked composables. Only read lazily
// inside the composable factories, i.e. after module initialisation.
const cart = ref<Schemas["Cart"] | undefined>();
const sessionContext = ref<unknown>();
const selectedShippingMethod = ref<Schemas["ShippingMethod"] | null>(null);
const selectedPaymentMethod = ref<Schemas["PaymentMethod"] | null>(null);

mockNuxtImport("useCart", () => () => ({
  cart,
  refreshCart: mockRefreshCart,
}));

mockNuxtImport("useCheckout", () => () => ({
  getShippingMethods: mockGetShippingMethods,
  setShippingMethod: mockSetShippingMethod,
  selectedShippingMethod,
  getPaymentMethods: mockGetPaymentMethods,
  setPaymentMethod: mockSetPaymentMethod,
  selectedPaymentMethod,
}));

mockNuxtImport("useSessionContext", () => () => ({
  sessionContext,
}));

const delivery = {
  id: "sm-delivery",
  name: "Lieferung",
  position: 1,
} as Schemas["ShippingMethod"];
const pickup = {
  id: "sm-pickup",
  name: "Abholung",
  position: 2,
} as Schemas["ShippingMethod"];

const cash = {
  id: "pm-cash",
  name: "Cash",
  distinguishableName: "Barzahlung",
} as Schemas["PaymentMethod"];
const paypal = {
  id: "pm-paypal",
  name: "PayPal",
  distinguishableName: "PayPal",
} as Schemas["PaymentMethod"];

const shippingBlocked = {
  code: 0,
  key: "shipping-method-blocked-Lieferung",
  level: 10 as const,
  message: "Shipping method Lieferung not available. Reason: not allowed",
  messageKey: "shipping-method-blocked",
};

const paymentBlocked = {
  code: 0,
  key: "payment-method-blocked-Barzahlung",
  level: 10 as const,
  message: "Payment method Barzahlung not available. Reason: not allowed",
  messageKey: "payment-method-blocked",
};

function cartWith(errors: Schemas["Cart"]["errors"]): Schemas["Cart"] {
  return { errors } as unknown as Schemas["Cart"];
}

/** Makes the next cart refresh resolve to the given cart state. */
function nextRefreshSets(errors: Schemas["Cart"]["errors"]) {
  mockRefreshCart.mockImplementationOnce(async () => {
    cart.value = cartWith(errors);
  });
}

describe("useCheckoutMethodGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cart.value = cartWith({});
    sessionContext.value = {
      salesChannel: { shippingMethodId: pickup.id, paymentMethodId: paypal.id },
    };
    selectedShippingMethod.value = delivery;
    selectedPaymentMethod.value = cash;
    mockRefreshCart.mockResolvedValue(undefined);
    mockSetShippingMethod.mockResolvedValue(undefined);
    mockSetPaymentMethod.mockResolvedValue(undefined);
    mockGetShippingMethods.mockResolvedValue(ref([delivery, pickup]));
    mockGetPaymentMethods.mockResolvedValue(ref([cash, paypal]));
  });

  describe("cart error helpers", () => {
    it("reads errors delivered as keyed object", () => {
      const c = cartWith({ [shippingBlocked.key]: shippingBlocked });
      expect(getCartErrors(c)).toEqual([shippingBlocked]);
      expect(hasBlockedShippingMethod(c)).toBe(true);
      expect(hasBlockedPaymentMethod(c)).toBe(false);
    });

    it("reads errors delivered as array", () => {
      const c = cartWith([paymentBlocked]);
      expect(hasBlockedPaymentMethod(c)).toBe(true);
      expect(hasBlockedShippingMethod(c)).toBe(false);
    });

    it("ignores unrelated errors and missing carts", () => {
      const c = cartWith({
        "promotion-not-found-x": {
          ...shippingBlocked,
          messageKey: "promotion-not-found",
        },
      });
      expect(hasBlockedShippingMethod(c)).toBe(false);
      expect(hasBlockedPaymentMethod(c)).toBe(false);
      expect(hasBlockedShippingMethod(undefined)).toBe(false);
      expect(hasBlockedPaymentMethod(undefined)).toBe(false);
    });
  });

  describe("ensureAvailableShippingMethod", () => {
    it("returns true without switching when nothing is blocked", async () => {
      const { ensureAvailableShippingMethod, isShippingMethodBlocked } =
        useCheckoutMethodGuard();

      await expect(ensureAvailableShippingMethod()).resolves.toBe(true);

      expect(mockRefreshCart).toHaveBeenCalledTimes(1);
      expect(mockGetShippingMethods).not.toHaveBeenCalled();
      expect(mockSetShippingMethod).not.toHaveBeenCalled();
      expect(isShippingMethodBlocked.value).toBe(false);
    });

    it("never switches a blocked shipping method, it only reports it", async () => {
      // La Fattoria: "Lieferung" is blocked until the guest has entered an
      // address in the delivery area; switching made every order a pickup
      cart.value = cartWith({ [shippingBlocked.key]: shippingBlocked });

      const { ensureAvailableShippingMethod, isShippingMethodBlocked } =
        useCheckoutMethodGuard();

      await expect(ensureAvailableShippingMethod()).resolves.toBe(false);

      expect(mockRefreshCart).toHaveBeenCalledTimes(1);
      expect(mockGetShippingMethods).not.toHaveBeenCalled();
      expect(mockSetShippingMethod).not.toHaveBeenCalled();
      expect(isShippingMethodBlocked.value).toBe(true);
    });
  });

  describe("ensureAvailablePaymentMethod", () => {
    it("switches to the sales-channel default payment method when blocked", async () => {
      cart.value = cartWith({ [paymentBlocked.key]: paymentBlocked });
      mockRefreshCart.mockImplementationOnce(async () => {});
      nextRefreshSets({});

      const { ensureAvailablePaymentMethod, isPaymentMethodBlocked } =
        useCheckoutMethodGuard();

      await expect(ensureAvailablePaymentMethod()).resolves.toBe(true);

      expect(mockGetPaymentMethods).toHaveBeenCalledWith({
        forceReload: true,
      });
      expect(mockSetPaymentMethod).toHaveBeenCalledWith({ id: paypal.id });
      expect(mockSetShippingMethod).not.toHaveBeenCalled();
      expect(isPaymentMethodBlocked.value).toBe(false);
    });

    it("returns false when no alternative payment method exists", async () => {
      cart.value = cartWith({ [paymentBlocked.key]: paymentBlocked });
      mockGetPaymentMethods.mockResolvedValue(ref([cash]));

      const { ensureAvailablePaymentMethod, isPaymentMethodBlocked } =
        useCheckoutMethodGuard();

      await expect(ensureAvailablePaymentMethod()).resolves.toBe(false);

      expect(mockSetPaymentMethod).not.toHaveBeenCalled();
      expect(isPaymentMethodBlocked.value).toBe(true);
    });
  });

  describe("ensureAvailableCheckoutMethods", () => {
    it("refreshes the cart once and returns true when nothing is blocked", async () => {
      const { ensureAvailableCheckoutMethods } = useCheckoutMethodGuard();

      await expect(ensureAvailableCheckoutMethods()).resolves.toBe(true);

      expect(mockRefreshCart).toHaveBeenCalledTimes(1);
      expect(mockSetShippingMethod).not.toHaveBeenCalled();
      expect(mockSetPaymentMethod).not.toHaveBeenCalled();
    });

    it("keeps a blocked shipping method and leaves payment untouched", async () => {
      cart.value = cartWith({
        [shippingBlocked.key]: shippingBlocked,
        [paymentBlocked.key]: paymentBlocked,
      });

      const { ensureAvailableCheckoutMethods } = useCheckoutMethodGuard();

      await expect(ensureAvailableCheckoutMethods()).resolves.toBe(false);

      expect(mockSetShippingMethod).not.toHaveBeenCalled();
      expect(mockGetPaymentMethods).not.toHaveBeenCalled();
      expect(mockSetPaymentMethod).not.toHaveBeenCalled();
    });

    it("returns false when the payment method cannot be resolved", async () => {
      cart.value = cartWith({ [paymentBlocked.key]: paymentBlocked });
      mockGetPaymentMethods.mockResolvedValue(ref([cash]));

      const { ensureAvailableCheckoutMethods, isPaymentMethodBlocked } =
        useCheckoutMethodGuard();

      await expect(ensureAvailableCheckoutMethods()).resolves.toBe(false);
      expect(isPaymentMethodBlocked.value).toBe(true);
    });

    it("serializes concurrent calls so the switch happens only once", async () => {
      cart.value = cartWith({ [paymentBlocked.key]: paymentBlocked });
      let releaseFirstRefresh: () => void = () => {};
      mockRefreshCart.mockImplementationOnce(
        () => new Promise<void>((r) => (releaseFirstRefresh = r)),
      );
      nextRefreshSets({});

      const { ensureAvailableCheckoutMethods, ensureAvailablePaymentMethod } =
        useCheckoutMethodGuard();

      const first = ensureAvailableCheckoutMethods();
      const second = ensureAvailablePaymentMethod();
      await Promise.resolve();
      expect(mockRefreshCart).toHaveBeenCalledTimes(1);

      releaseFirstRefresh();
      await expect(first).resolves.toBe(true);
      await expect(second).resolves.toBe(true);

      expect(mockSetPaymentMethod).toHaveBeenCalledTimes(1);
      // second call re-checked after the first one finished
      expect(mockRefreshCart).toHaveBeenCalledTimes(3);
      expect(mockRefreshCart.mock.invocationCallOrder[2]).toBeGreaterThan(
        mockSetPaymentMethod.mock.invocationCallOrder[0] as number,
      );
    });

    it("still runs after a previous call failed", async () => {
      mockRefreshCart.mockRejectedValueOnce(new Error("network"));

      const { ensureAvailableCheckoutMethods } = useCheckoutMethodGuard();

      await expect(ensureAvailableCheckoutMethods()).rejects.toThrow("network");
      await expect(ensureAvailableCheckoutMethods()).resolves.toBe(true);
    });

    it("resets isResolving even when a request fails", async () => {
      mockRefreshCart.mockRejectedValueOnce(new Error("network"));

      const { ensureAvailableCheckoutMethods, isResolving } =
        useCheckoutMethodGuard();

      await expect(ensureAvailableCheckoutMethods()).rejects.toThrow("network");
      expect(isResolving.value).toBe(false);
    });
  });
});
