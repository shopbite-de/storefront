import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useTopSellers } from "../../app/composables/useTopSellers";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

mockNuxtImport("useShopwareContext", () => {
  return () => ({
    apiClient: {
      invoke: mockInvoke,
    },
  });
});

describe("useTopSellers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load top sellers successfully", async () => {
    const mockElements = [{ id: "1", name: "Top Product" }];
    mockInvoke.mockResolvedValue({
      data: {
        elements: mockElements,
      },
    });

    const { loadTopSellers } = useTopSellers();
    const result = await loadTopSellers();

    expect(mockInvoke).toHaveBeenCalledWith(
      "getTopSellers post /product",
      expect.any(Object),
    );
    expect(result).toEqual(mockElements);
  });

  it("should return empty array on error", async () => {
    mockInvoke.mockRejectedValue(new Error("Network error"));

    // Silence console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { loadTopSellers } = useTopSellers();
    const result = await loadTopSellers();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
