import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProductConfigurator } from "../../app/composables/useProductConfigurator";

const { mockInvoke, mockConfigurator, mockProduct } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockConfigurator: { value: [] },
  mockProduct: { value: { id: "p1", optionIds: [], options: [] } },
}));

// Use vi.mock for explicit imports
vi.mock("@shopware/composables", () => ({
  useShopwareContext: () => ({
    apiClient: {
      invoke: mockInvoke,
    },
  }),
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
    } as any;
  });

  it("should initialize with selected options from product", () => {
    mockConfigurator.value = [
      {
        id: "g1",
        name: "Size",
        options: [{ id: "o1", name: "Small" }],
      },
    ] as any;
    mockProduct.value = {
      id: "p1-v1",
      parentId: "p1",
      optionIds: ["o1"],
      options: [{ id: "o1" }],
    } as any;

    const { isLoadingOptions } = useProductConfigurator();
    expect(isLoadingOptions.value).toBe(true);
  });

  it("should find variant for selected options", async () => {
    mockProduct.value = { parentId: "parent-1" } as any;
    mockInvoke.mockResolvedValue({
      data: {
        elements: [{ id: "variant-1" }],
      },
    });

    const { findVariantForSelectedOptions } = useProductConfigurator();
    const result = await findVariantForSelectedOptions({ Size: "o1" });

    expect(mockInvoke).toHaveBeenCalledWith(
      "readProduct post /product",
      expect.any(Object),
    );
    expect(result).toEqual({ id: "variant-1" });
  });

  it("should return undefined on error in findVariantForSelectedOptions", async () => {
    mockInvoke.mockRejectedValue(new Error("API Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { findVariantForSelectedOptions } = useProductConfigurator();
    const result = await findVariantForSelectedOptions({ Size: "o1" });

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
