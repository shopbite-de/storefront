import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useProductConfigurator } from "../../app/composables/useProductConfigurator";

const { mockFetch, mockConfigurator, mockProduct } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockConfigurator: { value: [] },
  mockProduct: { value: { id: "p1", optionIds: [], options: [] } },
}));

// `$fetch` is a Nuxt auto-import (bound at module load), so a global stub
// would not reach the composable.
mockNuxtImport("$fetch", () => mockFetch);

vi.mock("@shopware/composables", () => ({
  useProductConfigurator: () => ({
    handleChange: vi.fn(),
  }),
  useProduct: () => ({
    configurator: mockConfigurator,
    product: mockProduct,
  }),
}));

describe("useProductConfigurator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigurator.value = [];
    mockProduct.value = {
      id: "p1",
      optionIds: [],
      options: [],
    } as unknown as typeof mockProduct.value;
  });

  it("should initialize with selected options from product", () => {
    mockConfigurator.value = [
      {
        id: "g1",
        name: "Size",
        options: [{ id: "o1", name: "Small" }],
      },
    ] as unknown as typeof mockConfigurator.value;
    mockProduct.value = {
      id: "p1-v1",
      parentId: "p1",
      optionIds: ["o1"],
      options: [{ id: "o1" }],
    } as unknown as typeof mockProduct.value;

    const { isLoadingOptions } = useProductConfigurator();
    expect(isLoadingOptions.value).toBe(true);
  });

  it("should find variant for selected options", async () => {
    mockProduct.value = {
      parentId: "parent-1",
    } as unknown as typeof mockProduct.value;
    mockFetch.mockResolvedValue({ id: "variant-1" });

    const { findVariantForSelectedOptions } = useProductConfigurator();
    const result = await findVariantForSelectedOptions({ Size: "o1" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/product/variant",
      expect.objectContaining({
        query: {
          parentId: "parent-1",
          optionIds: ["o1"],
        },
      }),
    );
    expect(result).toEqual({ id: "variant-1" });
  });

  it("should return undefined on error in findVariantForSelectedOptions", async () => {
    mockFetch.mockRejectedValue(new Error("API Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { findVariantForSelectedOptions } = useProductConfigurator();
    const result = await findVariantForSelectedOptions({ Size: "o1" });

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
