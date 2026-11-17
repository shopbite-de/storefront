import { describe, it, expect, vi } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { useTopSellers } from "~/composables/useTopSellers";

const { topSellers } = vi.hoisted(() => ({ topSellers: vi.fn() }));

registerEndpoint("/api/top-sellers", () => topSellers());

describe("useTopSellers", () => {
  it("should load top sellers from the server cache", async () => {
    const mockElements = [{ id: "1", name: "Top Product" }];
    topSellers.mockReturnValue(mockElements);

    const { loadTopSellers } = useTopSellers();
    const result = await loadTopSellers();

    expect(topSellers).toHaveBeenCalled();
    expect(result).toEqual(mockElements);
  });

  it("should return empty array on error", async () => {
    topSellers.mockImplementation(() => {
      throw new Error("Network error");
    });

    // Silence console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { loadTopSellers } = useTopSellers();
    const result = await loadTopSellers();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
