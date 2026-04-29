import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useProductConfigurator } from "../../app/composables/useProductConfigurator";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal("$fetch", mockFetch);

describe("useProductConfigurator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return findVariantForSelectedOptions function", () => {
    const { findVariantForSelectedOptions } = useProductConfigurator();
    expect(typeof findVariantForSelectedOptions).toBe("function");
  });

  it("should find variant for selected options", async () => {
    const product = ref({ parentId: "parent-1", id: "p1" });
    mockFetch.mockResolvedValue({ id: "variant-1" });

    const { findVariantForSelectedOptions } = useProductConfigurator(product);
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
    const product = ref({ parentId: "parent-1", id: "p1" });
    mockFetch.mockRejectedValue(new Error("API Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { findVariantForSelectedOptions } = useProductConfigurator(product);
    const result = await findVariantForSelectedOptions({ Size: "o1" });

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should return undefined when product has no parentId or id", async () => {
    const product = ref({ parentId: null, id: null });

    const { findVariantForSelectedOptions } = useProductConfigurator(product);
    const result = await findVariantForSelectedOptions({ Size: "o1" });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
