import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTopSellers } from "~/composables/useTopSellers";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal("$fetch", mockFetch);

describe("useTopSellers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load top sellers successfully", async () => {
    const mockElements = [{ id: "1", name: "Top Product" }];
    mockFetch.mockResolvedValue(mockElements);

    const { loadTopSellers } = useTopSellers();
    const result = await loadTopSellers();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/products",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          filter: expect.arrayContaining([
            expect.objectContaining({ field: "markAsTopseller" }),
          ]),
        }),
      }),
    );
    expect(result).toEqual(mockElements);
  });

  it("should return empty array on error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    // Silence console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { loadTopSellers } = useTopSellers();
    const result = await loadTopSellers();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
