import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import {
  useCartMutations,
  isCartLockedError,
} from "~/composables/useCartMutations";
import type { Schemas } from "#shopware";

const {
  mockRefreshCart,
  mockAddProducts,
  mockChangeProductQuantity,
  mockRemoveItem,
  mockToastAdd,
} = vi.hoisted(() => ({
  mockRefreshCart: vi.fn(),
  mockAddProducts: vi.fn(),
  mockChangeProductQuantity: vi.fn(),
  mockRemoveItem: vi.fn(),
  mockToastAdd: vi.fn(),
}));

// Read lazily inside the factory, i.e. after module initialisation.
const cart = ref<Schemas["Cart"] | undefined>();

mockNuxtImport("useCart", () => () => ({
  cart,
  refreshCart: mockRefreshCart,
  addProducts: mockAddProducts,
  changeProductQuantity: mockChangeProductQuantity,
  removeItem: mockRemoveItem,
}));

mockNuxtImport("useToast", () => () => ({
  add: mockToastAdd,
}));

function cartWith(items: { id: string; quantity: number }[]) {
  return { lineItems: items } as unknown as Schemas["Cart"];
}

/** A promise the test resolves by hand. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const lockedError = Object.assign(new Error("locked"), {
  status: 409,
  details: { errors: [{ code: "CHECKOUT__CART_LOCKED" }] },
});

describe("isCartLockedError", () => {
  it("detects the lock conflict by status or error code", () => {
    expect(isCartLockedError(lockedError)).toBe(true);
    expect(isCartLockedError({ status: 409 })).toBe(true);
    expect(
      isCartLockedError({
        details: { errors: [{ code: "CHECKOUT__CART_LOCKED" }] },
      }),
    ).toBe(true);
    expect(isCartLockedError({ status: 500 })).toBe(false);
    expect(isCartLockedError(new Error("x"))).toBe(false);
    expect(isCartLockedError(undefined)).toBe(false);
  });
});

describe("useCartMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cart.value = cartWith([{ id: "li-1", quantity: 1 }]);
    mockRefreshCart.mockResolvedValue(undefined);
    mockAddProducts.mockResolvedValue({ id: "cart" });
    mockRemoveItem.mockResolvedValue({ id: "cart" });
    mockChangeProductQuantity.mockImplementation(
      async ({ id, quantity }: { id: string; quantity: number }) => {
        cart.value = cartWith([{ id, quantity }]);
        return cart.value;
      },
    );
  });

  it("runs writes one after another in call order", async () => {
    const first = deferred<Schemas["Cart"]>();
    mockAddProducts.mockReturnValueOnce(first.promise);

    const { addLineItems, removeLineItem, isMutating } = useCartMutations();

    const add = addLineItems([{ id: "p1", quantity: 1, type: "product" }]);
    const remove = removeLineItem({ id: "li-1" } as Schemas["LineItem"]);
    await Promise.resolve();

    expect(isMutating.value).toBe(true);
    expect(mockAddProducts).toHaveBeenCalledTimes(1);
    expect(mockRemoveItem).not.toHaveBeenCalled();

    first.resolve({ id: "cart" } as unknown as Schemas["Cart"]);
    await add;
    await remove;

    expect(mockRemoveItem).toHaveBeenCalledTimes(1);
    expect(mockAddProducts.mock.invocationCallOrder[0]).toBeLessThan(
      mockRemoveItem.mock.invocationCallOrder[0] as number,
    );
    expect(isMutating.value).toBe(false);
  });

  it("coalesces rapid quantity changes into one request with the latest value", async () => {
    const inFlight = deferred<Schemas["Cart"]>();
    mockChangeProductQuantity.mockReturnValueOnce(inFlight.promise);

    const { setQuantity } = useCartMutations();

    const p1 = setQuantity("li-1", 2);
    await Promise.resolve();
    expect(mockChangeProductQuantity).toHaveBeenCalledWith({
      id: "li-1",
      quantity: 2,
    });

    // while the first request is in flight: three more clicks
    const p2 = setQuantity("li-1", 3);
    const p3 = setQuantity("li-1", 4);
    const p4 = setQuantity("li-1", 5);
    expect(p3).toBe(p2);
    expect(p4).toBe(p2);

    cart.value = cartWith([{ id: "li-1", quantity: 2 }]);
    inFlight.resolve(cart.value);
    await Promise.all([p1, p2, p3, p4]);

    expect(mockChangeProductQuantity).toHaveBeenCalledTimes(2);
    expect(mockChangeProductQuantity).toHaveBeenLastCalledWith({
      id: "li-1",
      quantity: 5,
    });
  });

  it("skips the request when the latest value equals the cart quantity", async () => {
    const { setQuantity } = useCartMutations();

    await setQuantity("li-1", 1);

    expect(mockChangeProductQuantity).not.toHaveBeenCalled();
  });

  it("retries once when the cart is locked", async () => {
    vi.useFakeTimers();
    try {
      mockChangeProductQuantity
        .mockRejectedValueOnce(lockedError)
        .mockResolvedValueOnce(cartWith([{ id: "li-1", quantity: 3 }]));

      const { setQuantity } = useCartMutations();
      const pending = setQuantity("li-1", 3);
      await vi.advanceTimersByTimeAsync(400);
      await pending;

      expect(mockChangeProductQuantity).toHaveBeenCalledTimes(2);
      expect(mockToastAdd).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("syncs the shared cart from the write response", async () => {
    const returned = cartWith([
      { id: "li-1", quantity: 1 },
      { id: "li-2", quantity: 1 },
    ]);
    mockAddProducts.mockResolvedValueOnce(returned);

    const { addLineItems } = useCartMutations();
    await addLineItems([{ id: "p2", quantity: 1, type: "product" }]);

    expect(mockRefreshCart).toHaveBeenCalledWith(returned);
  });

  it("does not retry other errors", async () => {
    mockChangeProductQuantity.mockRejectedValueOnce(new Error("network"));

    const { setQuantity } = useCartMutations();
    await setQuantity("li-1", 3);

    expect(mockChangeProductQuantity).toHaveBeenCalledTimes(1);
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Menge konnte nicht geändert werden" }),
    );
  });

  it("reports a final failure, re-syncs the cart and resolves undefined", async () => {
    mockRemoveItem.mockRejectedValue(new Error("network"));

    const { removeLineItem, isMutating } = useCartMutations();
    const result = await removeLineItem({ id: "li-1" } as Schemas["LineItem"]);

    expect(result).toBeUndefined();
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Artikel konnte nicht entfernt werden",
        color: "error",
      }),
    );
    expect(mockRefreshCart).toHaveBeenCalledWith();
    expect(isMutating.value).toBe(false);
  });

  it("keeps processing the queue after a failure", async () => {
    mockAddProducts.mockRejectedValueOnce(new Error("boom"));

    const { addLineItems } = useCartMutations();
    const failed = addLineItems([{ id: "p1", quantity: 1, type: "product" }]);
    const next = addLineItems([{ id: "p2", quantity: 1, type: "product" }]);

    expect(await failed).toBeUndefined();
    expect(await next).toEqual({ id: "cart" });
    expect(mockAddProducts).toHaveBeenCalledTimes(2);
  });
});
