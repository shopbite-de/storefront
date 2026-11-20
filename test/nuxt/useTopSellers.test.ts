import { describe, it, expect, vi } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { useTopSellers } from "~/composables/useTopSellers";
import { dish } from "../support/dishes";

const { topSellers } = vi.hoisted(() => ({ topSellers: vi.fn() }));

registerEndpoint("/api/top-sellers", () => topSellers());

describe("useTopSellers", () => {
  it("loads the top sellers' dishes from the BFF", async () => {
    const dishes = [dish({ id: "1", name: "Pizza Margherita" })];
    topSellers.mockReturnValue(dishes);

    const { loadTopSellers } = useTopSellers();
    const result = await loadTopSellers();

    expect(topSellers).toHaveBeenCalled();
    expect(result).toEqual(dishes);
  });

  it("answers no dishes on an error", async () => {
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
