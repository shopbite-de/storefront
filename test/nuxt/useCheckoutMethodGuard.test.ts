import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useCheckoutMethodGuard } from "~/composables/useCheckoutMethodGuard";
import type { Schemas } from "#shopware";
import type { CartMessage, CartMessageCode } from "../../shared/domain";

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
// the cart's messages (domain codes)
const cart = ref<CartMessage[]>([]);
const sessionContext = ref<unknown>();
const selectedShippingMethod = ref<Schemas["ShippingMethod"] | null>(null);
const selectedPaymentMethod = ref<Schemas["PaymentMethod"] | null>(null);

mockNuxtImport("useCartData", () => () => ({
  hasMessage: (code: CartMessageCode) =>
    cart.value.some((message) => message.code === code),
  refresh: mockRefreshCart,
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

type KeyedMessage = CartMessage & { key: string };

const shippingBlocked: KeyedMessage = {
  key: "shipping-method-blocked-Lieferung",
  code: "shipping_method_blocked",
  severity: "warning",
  text: "Shipping method Lieferung not available. Reason: not allowed",
  subjectId: null,
};

const paymentBlocked: KeyedMessage = {
  key: "payment-method-blocked-Barzahlung",
  code: "payment_method_blocked",
  severity: "warning",
  text: "Payment method Barzahlung not available. Reason: not allowed",
  subjectId: null,
};

function cartWith(messages: Record<string, CartMessage>): CartMessage[] {
  return Object.values(messages);
}

/** Makes the next cart refresh resolve to the given cart state. */
function nextRefreshSets(errors: Record<string, CartMessage>) {
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
      // e.g. "Lieferung" is blocked until the guest has entered an
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
