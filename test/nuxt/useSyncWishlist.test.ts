import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useSyncWishlist } from "../../app/composables/useSyncWishlist";

const { ApiClientErrorMock } = vi.hoisted(() => ({
  ApiClientErrorMock: class extends Error {
    details: unknown;
    constructor(details: unknown) {
      super("ApiClientError");
      this.details = details;
    }
  },
}));

vi.mock("@shopware/api-client", () => ({
  ApiClientError: ApiClientErrorMock,
}));

const invokeMock = vi.fn();
mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke: invokeMock },
}));

function apiError(code: string) {
  return new ApiClientErrorMock({ errors: [{ code }] });
}

describe("useSyncWishlist", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("loads the wishlist products", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        products: {
          elements: [{ id: "p1" }, { id: "p2" }],
          total: 2,
          page: 1,
          limit: 15,
        },
      },
    });

    const { getWishlistProducts, items, count } = useSyncWishlist();
    await getWishlistProducts();

    expect(items.value).toEqual(["p1", "p2"]);
    expect(count.value).toBe(2);
  });

  it.each([
    "CHECKOUT__WISHLIST_NOT_FOUND",
    "CHECKOUT__WISHLIST_IS_NOT_ACTIVATED",
  ])("treats %s as an empty wishlist without logging", async (code) => {
    invokeMock.mockRejectedValueOnce(apiError(code));

    const { getWishlistProducts, items, count } = useSyncWishlist();
    await getWishlistProducts();

    expect(items.value).toEqual([]);
    expect(count.value).toBe(0);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("logs unexpected errors", async () => {
    invokeMock.mockRejectedValueOnce(new Error("Network down"));

    const { getWishlistProducts, items } = useSyncWishlist();
    await getWishlistProducts();

    expect(items.value).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[useSyncWishlist][getWishlistProducts][error]:",
      expect.any(Error),
    );
  });
});
