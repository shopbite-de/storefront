import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport, registerEndpoint } from "@nuxt/test-utils/runtime";
import { readBody, type H3Event } from "h3";
import { ref } from "vue";
import { useCartMutations } from "~/composables/useCartMutations";
import type { Cart } from "../../shared/domain";
import { cart as cartOf, cartLine } from "../support/cart";

const { mockRefresh, mockSetCart, mockFetch } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockSetCart: vi.fn(),
  mockFetch: vi.fn(),
}));

// Read lazily inside the factory, i.e. after module initialisation.
const cart = ref<Cart | null>(null);

// The BFF routes record what the browser sent: (url, { method, body }).
for (const url of ["/api/cart/lines", "/api/cart/lines/li-1"]) {
  registerEndpoint(url, async (event: H3Event) =>
    mockFetch(
      url,
      event.method === "DELETE"
        ? { method: "DELETE" }
        : { method: event.method, body: await readBody(event) },
    ),
  );
}

mockNuxtImport("useCartData", () => () => ({
  cart,
  refresh: mockRefresh,
  setCart: mockSetCart,
}));

function cartWith(lines: { id: string; quantity: number }[]): Cart {
  return cartOf({ lines: lines.map((line) => cartLine(line)) });
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

const PLAIN = {
  dishId: "p1",
  variantId: null,
  extraIds: [],
  removedIngredientIds: [],
  quantity: 1,
};

/** The quantity PATCH calls of the cart line routes. */
const quantityCalls = () =>
  mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH");

describe("useCartMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cart.value = cartWith([{ id: "li-1", quantity: 1 }]);
    mockRefresh.mockResolvedValue(cart.value);
    mockFetch.mockImplementation(
      async (url: string, options?: { method?: string; body?: unknown }) => {
        if (options?.method === "PATCH") {
          const id = decodeURIComponent(url.split("/").at(-1)!);
          const { quantity } = options.body as { quantity: number };
          cart.value = cartWith([{ id, quantity }]);
          return cart.value;
        }
        return cartOf();
      },
    );
  });

  it("sends each write to its BFF route", async () => {
    const { addLine, setQuantity, removeLine } = useCartMutations();

    await addLine(PLAIN);
    await setQuantity("li-1", 3);
    await removeLine("li-1");

    expect(mockFetch.mock.calls).toEqual([
      ["/api/cart/lines", { method: "POST", body: PLAIN }],
      ["/api/cart/lines/li-1", { method: "PATCH", body: { quantity: 3 } }],
      ["/api/cart/lines/li-1", { method: "DELETE" }],
    ]);
  });

  it("runs writes one after another in call order", async () => {
    const first = deferred<Cart>();
    mockFetch.mockReturnValueOnce(first.promise);

    const { addLine, removeLine, isMutating } = useCartMutations();

    const add = addLine(PLAIN);
    const remove = removeLine("li-1");
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    expect(isMutating.value).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    first.resolve(cartOf());
    await add;
    await remove;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1]![1]).toEqual({ method: "DELETE" });
    expect(isMutating.value).toBe(false);
  });

  it("coalesces rapid quantity changes into one request with the latest value", async () => {
    const inFlight = deferred<Cart>();
    mockFetch.mockReturnValueOnce(inFlight.promise);

    const { setQuantity } = useCartMutations();

    const p1 = setQuantity("li-1", 2);
    await vi.waitFor(() => expect(quantityCalls()).toHaveLength(1));
    expect(quantityCalls()).toEqual([
      ["/api/cart/lines/li-1", { method: "PATCH", body: { quantity: 2 } }],
    ]);

    // while the first request is in flight: three more clicks
    const p2 = setQuantity("li-1", 3);
    const p3 = setQuantity("li-1", 4);
    const p4 = setQuantity("li-1", 5);
    expect(p3).toBe(p2);
    expect(p4).toBe(p2);

    cart.value = cartWith([{ id: "li-1", quantity: 2 }]);
    inFlight.resolve(cart.value);
    await Promise.all([p1, p2, p3, p4]);

    expect(quantityCalls()).toHaveLength(2);
    expect(quantityCalls().at(-1)).toEqual([
      "/api/cart/lines/li-1",
      { method: "PATCH", body: { quantity: 5 } },
    ]);
  });

  it("skips the request when the latest value equals the cart quantity", async () => {
    const { setQuantity } = useCartMutations();

    await setQuantity("li-1", 1);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("syncs the shared cart from the write response", async () => {
    const returned = cartWith([
      { id: "li-1", quantity: 1 },
      { id: "li-2", quantity: 1 },
    ]);
    mockFetch.mockResolvedValueOnce(returned);

    const { addLine } = useCartMutations();
    await addLine(PLAIN);

    expect(mockSetCart).toHaveBeenCalledWith(returned);
  });

  it("re-syncs the cart after a failed write", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { setQuantity } = useCartMutations();
    await setQuantity("li-1", 3);

    expect(quantityCalls()).toHaveLength(1);
    expect(mockRefresh).toHaveBeenCalledWith();
  });

  it("re-syncs the cart and resolves undefined after a final failure", async () => {
    mockFetch.mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { removeLine, isMutating } = useCartMutations();
    const result = await removeLine("li-1");

    expect(result).toBeUndefined();
    expect(mockRefresh).toHaveBeenCalledWith();
    expect(isMutating.value).toBe(false);
  });

  it("keeps processing the queue after a failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const answer = cartWith([{ id: "p2", quantity: 1 }]);
    mockFetch.mockResolvedValueOnce(answer);

    const { addLine } = useCartMutations();
    const failed = addLine(PLAIN);
    const next = addLine({ ...PLAIN, dishId: "p2" });

    expect(await failed).toBeUndefined();
    expect(await next).toEqual(answer);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
