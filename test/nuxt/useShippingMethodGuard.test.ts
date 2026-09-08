import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import {
  useShippingMethodGuard,
  hasBlockedShippingMethod,
  getCartErrors,
} from "~/composables/useShippingMethodGuard";
import type { Schemas } from "#shopware";

const {
  mockRefreshCart,
  mockGetShippingMethods,
  mockSetShippingMethod,
  mockToastAdd,
} = vi.hoisted(() => ({
  mockRefreshCart: vi.fn(),
  mockGetShippingMethods: vi.fn(),
  mockSetShippingMethod: vi.fn(),
  mockToastAdd: vi.fn(),
}));

// Reactive state shared with the mocked composables. Only read lazily
// inside the composable factories, i.e. after module initialisation.
const cart = ref<Schemas["Cart"] | undefined>();
const sessionContext = ref<unknown>();
const selectedShippingMethod = ref<Schemas["ShippingMethod"] | null>(null);

mockNuxtImport("useCart", () => () => ({
  cart,
  refreshCart: mockRefreshCart,
}));

mockNuxtImport("useCheckout", () => () => ({
  getShippingMethods: mockGetShippingMethods,
  setShippingMethod: mockSetShippingMethod,
  selectedShippingMethod,
}));

mockNuxtImport("useSessionContext", () => () => ({
  sessionContext,
}));

mockNuxtImport("useToast", () => () => ({
  add: mockToastAdd,
}));

const delivery = { id: "sm-delivery", name: "Lieferung", position: 1 };
const pickup = { id: "sm-pickup", name: "Abholung", position: 2 };

const blockedError = {
  code: 0,
  key: "shipping-method-blocked-Lieferung",
  level: 10 as const,
  message: "Shipping method Lieferung not available. Reason: not allowed",
  messageKey: "shipping-method-blocked",
};

function cartWith(errors: Schemas["Cart"]["errors"]): Schemas["Cart"] {
  return { errors } as unknown as Schemas["Cart"];
}

describe("useShippingMethodGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cart.value = cartWith({});
    sessionContext.value = { salesChannel: { shippingMethodId: pickup.id } };
    selectedShippingMethod.value = delivery as Schemas["ShippingMethod"];
    mockRefreshCart.mockResolvedValue(undefined);
    mockSetShippingMethod.mockResolvedValue(undefined);
    mockGetShippingMethods.mockResolvedValue(ref([delivery, pickup]));
  });

  describe("cart error helpers", () => {
    it("reads errors delivered as keyed object", () => {
      const c = cartWith({ [blockedError.key]: blockedError });
      expect(getCartErrors(c)).toEqual([blockedError]);
      expect(hasBlockedShippingMethod(c)).toBe(true);
    });

    it("reads errors delivered as array", () => {
      const c = cartWith([blockedError]);
      expect(hasBlockedShippingMethod(c)).toBe(true);
    });

    it("ignores unrelated errors and missing carts", () => {
      const c = cartWith({
        "promotion-not-found-x": {
          ...blockedError,
          messageKey: "promotion-not-found",
        },
      });
      expect(hasBlockedShippingMethod(c)).toBe(false);
      expect(hasBlockedShippingMethod(undefined)).toBe(false);
    });
  });

  it("returns true without switching when no shipping method is blocked", async () => {
    const { ensureAvailableShippingMethod, isShippingMethodBlocked } =
      useShippingMethodGuard();

    await expect(ensureAvailableShippingMethod()).resolves.toBe(true);

    expect(mockRefreshCart).toHaveBeenCalledTimes(1);
    expect(mockGetShippingMethods).not.toHaveBeenCalled();
    expect(mockSetShippingMethod).not.toHaveBeenCalled();
    expect(mockToastAdd).not.toHaveBeenCalled();
    expect(isShippingMethodBlocked.value).toBe(false);
  });

  it("switches to the sales-channel default shipping method when blocked", async () => {
    cart.value = cartWith({ [blockedError.key]: blockedError });
    mockRefreshCart
      .mockImplementationOnce(async () => {})
      .mockImplementationOnce(async () => {
        cart.value = cartWith({});
      });
    const extra = { id: "sm-extra", name: "Express", position: 0 };
    mockGetShippingMethods.mockResolvedValue(ref([extra, delivery, pickup]));

    const { ensureAvailableShippingMethod } = useShippingMethodGuard();

    await expect(ensureAvailableShippingMethod()).resolves.toBe(true);

    expect(mockGetShippingMethods).toHaveBeenCalledWith({ forceReload: true });
    expect(mockSetShippingMethod).toHaveBeenCalledWith({ id: pickup.id });
    expect(mockRefreshCart).toHaveBeenCalledTimes(2);
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Versandart geändert",
        description:
          "Lieferung ist nicht mehr verfügbar. Abholung wurde ausgewählt.",
      }),
    );
  });

  it("falls back to the first available method when the default is not available", async () => {
    cart.value = cartWith({ [blockedError.key]: blockedError });
    sessionContext.value = { salesChannel: { shippingMethodId: delivery.id } };
    mockRefreshCart
      .mockImplementationOnce(async () => {})
      .mockImplementationOnce(async () => {
        cart.value = cartWith({});
      });
    // The blocked method is still returned by the API in some setups
    mockGetShippingMethods.mockResolvedValue(ref([delivery, pickup]));

    const { ensureAvailableShippingMethod } = useShippingMethodGuard();

    await expect(ensureAvailableShippingMethod()).resolves.toBe(true);
    expect(mockSetShippingMethod).toHaveBeenCalledWith({ id: pickup.id });
  });

  it("returns false when no alternative shipping method exists", async () => {
    cart.value = cartWith({ [blockedError.key]: blockedError });
    mockGetShippingMethods.mockResolvedValue(ref([delivery]));

    const { ensureAvailableShippingMethod, isShippingMethodBlocked } =
      useShippingMethodGuard();

    await expect(ensureAvailableShippingMethod()).resolves.toBe(false);

    expect(mockSetShippingMethod).not.toHaveBeenCalled();
    expect(mockToastAdd).not.toHaveBeenCalled();
    expect(isShippingMethodBlocked.value).toBe(true);
  });

  it("returns false when the cart is still blocked after switching", async () => {
    cart.value = cartWith({ [blockedError.key]: blockedError });

    const { ensureAvailableShippingMethod } = useShippingMethodGuard();

    await expect(ensureAvailableShippingMethod()).resolves.toBe(false);

    expect(mockSetShippingMethod).toHaveBeenCalledWith({ id: pickup.id });
    expect(mockToastAdd).not.toHaveBeenCalled();
  });

  it("resets isResolving even when a request fails", async () => {
    mockRefreshCart.mockRejectedValueOnce(new Error("network"));

    const { ensureAvailableShippingMethod, isResolving } =
      useShippingMethodGuard();

    await expect(ensureAvailableShippingMethod()).rejects.toThrow("network");
    expect(isResolving.value).toBe(false);
  });
});
