import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { defineComponent, h } from "vue";
import { useCategoryListing } from "~/composables/useCategoryListing";

// ---- mock helpers ------------------------------------------------------------

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

const emptyListing = (properties: string[] = []) => ({
  elements: [],
  aggregations: {},
  availableSortings: [],
  sorting: null,
  currentFilters: { properties },
});

// ---- helpers ----------------------------------------------------------------

let categoryCounter = 0;
/** Returns a unique category ID per test to prevent useLazyAsyncData key collisions. */
const uniqueId = () => `cat-${++categoryCounter}`;

/**
 * Mounts a minimal component that calls useCategoryListing so that
 * useLazyAsyncData triggers the initial fetch (it only runs inside a
 * component context).
 */
async function mountWithListing(
  categoryId: string,
  initialProperties: string[] = [],
) {
  let result!: ReturnType<typeof useCategoryListing>;

  await mountSuspended(
    defineComponent({
      setup() {
        result = useCategoryListing(categoryId, initialProperties);
        return () => h("div");
      },
    }),
  );

  await flushPromises();
  return result;
}

// ---- tests ------------------------------------------------------------------

describe("useCategoryListing", () => {
  beforeEach(() => {
    vi.stubGlobal("$fetch", mockFetch);
    mockFetch.mockResolvedValue(emptyListing());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ---- initial fetch (requires component context for useLazyAsyncData) ------

  describe("initial fetch", () => {
    it("fetches without properties when none are provided", async () => {
      const id = uniqueId();
      await mountWithListing(id);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/listing/${id}`,
        expect.objectContaining({
          query: expect.objectContaining({ properties: undefined }),
        }),
      );
    });

    it("fetches with persisted properties joined by pipe", async () => {
      const id = uniqueId();
      await mountWithListing(id, ["opt-a", "opt-b"]);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/listing/${id}`,
        expect.objectContaining({
          query: expect.objectContaining({ properties: "opt-a|opt-b" }),
        }),
      );
    });

    it("does not include properties param when initialProperties is empty", async () => {
      const id = uniqueId();
      await mountWithListing(id, []);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/listing/${id}`,
        expect.objectContaining({
          query: expect.objectContaining({ properties: undefined }),
        }),
      );
    });
  });

  // ---- setFilters ------------------------------------------------------------

  describe("setFilters", () => {
    it("re-fetches with the given property filter", async () => {
      const { setFilters } = useCategoryListing("cat-1");

      await setFilters([{ code: "properties", value: "opt-x|opt-y" }]);

      expect(mockFetch).toHaveBeenLastCalledWith(
        "/api/listing/cat-1",
        expect.objectContaining({
          query: expect.objectContaining({ properties: "opt-x|opt-y" }),
        }),
      );
    });

    it("sets loading true during fetch and false after", async () => {
      let resolve!: (v: unknown) => void;
      const { setFilters, loading } = useCategoryListing("cat-1");

      mockFetch.mockReturnValueOnce(new Promise((r) => (resolve = r)));
      const promise = setFilters([{ code: "properties", value: "opt-x" }]);

      expect(loading.value).toBe(true);
      resolve(emptyListing());
      await promise;
      expect(loading.value).toBe(false);
    });

    it("overwrites existing currentFilters properties with the new value", async () => {
      mockFetch.mockResolvedValueOnce(emptyListing(["old-opt"]));
      const { setFilters } = useCategoryListing("cat-1");

      await setFilters([{ code: "properties", value: "new-opt" }]);

      expect(mockFetch).toHaveBeenLastCalledWith(
        "/api/listing/cat-1",
        expect.objectContaining({
          query: expect.objectContaining({ properties: "new-opt" }),
        }),
      );
    });
  });

  // ---- resetFilters ----------------------------------------------------------

  describe("resetFilters", () => {
    it("re-fetches with all filter params cleared", async () => {
      const { resetFilters } = useCategoryListing("cat-1", ["opt-a"]);

      await resetFilters();

      expect(mockFetch).toHaveBeenLastCalledWith(
        "/api/listing/cat-1",
        expect.objectContaining({
          query: {
            properties: undefined,
            order: undefined,
            manufacturer: undefined,
            query: undefined,
            p: undefined,
          },
        }),
      );
    });
  });

  // ---- changeSorting ---------------------------------------------------------

  describe("changeSorting", () => {
    it("re-fetches with the given sort order", async () => {
      const { changeSorting } = useCategoryListing("cat-1");

      await changeSorting("price-asc");

      expect(mockFetch).toHaveBeenLastCalledWith(
        "/api/listing/cat-1",
        expect.objectContaining({
          query: expect.objectContaining({ order: "price-asc" }),
        }),
      );
    });
  });

  // ---- derived state ---------------------------------------------------------

  describe("derived state", () => {
    it("exposes elements from the listing response", async () => {
      const products = [{ id: "p1" }, { id: "p2" }];
      mockFetch.mockResolvedValueOnce({
        ...emptyListing(),
        elements: products,
      });

      const { elements, setFilters } = useCategoryListing(uniqueId());
      await setFilters([]);
      await flushPromises();

      expect(elements.value).toEqual(products);
    });

    it("defaults elements to empty array before data loads", async () => {
      const { elements } = useCategoryListing(uniqueId());
      expect(elements.value).toEqual([]);
    });

    it("exposes currentFilters from the listing response", async () => {
      mockFetch.mockResolvedValueOnce(emptyListing(["opt-x"]));

      const { currentFilters, setFilters } = useCategoryListing(uniqueId());
      await setFilters([]);
      await flushPromises();

      expect(currentFilters.value?.properties).toEqual(["opt-x"]);
    });
  });
});
