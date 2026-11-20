import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { defineComponent, h } from "vue";
import type { MenuListing } from "../../shared/domain";
import { useCategoryListing } from "~/composables/useCategoryListing";
import { dish } from "../support/dishes";

// ---- mock helpers ------------------------------------------------------------

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

// `$fetch` is a Nuxt auto-import (bound at module load), so a global stub
// would not reach the composable.
mockNuxtImport("$fetch", () => mockFetch);

/** A MenuListing as the BFF answers it. */
const listing = (fields: Partial<MenuListing> = {}): MenuListing => ({
  dishes: [],
  total: 0,
  page: 1,
  limit: 100,
  filters: [],
  sortings: [],
  sorting: "name-asc",
  filterOptionIds: [],
  ...fields,
});

// ---- helpers ----------------------------------------------------------------

let sectionCounter = 0;
/** A unique section id per test to prevent useLazyAsyncData key collisions. */
const uniqueId = () => `section-${++sectionCounter}`;

/**
 * Mounts a minimal component that calls useCategoryListing so that
 * useLazyAsyncData triggers the initial fetch (it only runs inside a
 * component context).
 */
async function mountWithListing(
  sectionId: string,
  initialFilters: string[] = [],
) {
  let result!: ReturnType<typeof useCategoryListing>;

  await mountSuspended(
    defineComponent({
      setup() {
        result = useCategoryListing(sectionId, initialFilters);
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
    mockFetch.mockResolvedValue(listing());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial fetch", () => {
    it("fetches without filters when none are provided", async () => {
      const id = uniqueId();
      await mountWithListing(id);

      expect(mockFetch).toHaveBeenCalledWith(`/api/listing/${id}`, {
        query: { order: undefined, filters: undefined },
      });
    });

    it("fetches with persisted filter options joined by pipe", async () => {
      const id = uniqueId();
      await mountWithListing(id, ["opt-a", "opt-b"]);

      expect(mockFetch).toHaveBeenCalledWith(`/api/listing/${id}`, {
        query: { order: undefined, filters: "opt-a|opt-b" },
      });
    });
  });

  describe("setFilters", () => {
    it("re-fetches with the given filter options and the default sorting", async () => {
      const { setFilters } = useCategoryListing("section-x");

      await setFilters(["opt-x", "opt-y"]);

      expect(mockFetch).toHaveBeenLastCalledWith("/api/listing/section-x", {
        query: { order: undefined, filters: "opt-x|opt-y" },
      });
    });

    it("sets loading true during fetch and false after", async () => {
      let resolve!: (v: unknown) => void;
      const { setFilters, loading } = useCategoryListing("section-x");

      mockFetch.mockReturnValueOnce(new Promise((r) => (resolve = r)));
      const promise = setFilters(["opt-x"]);

      expect(loading.value).toBe(true);
      resolve(listing());
      await promise;
      expect(loading.value).toBe(false);
    });
  });

  describe("resetFilters", () => {
    it("re-fetches without filters and sorting", async () => {
      const { resetFilters } = useCategoryListing("section-x", ["opt-a"]);

      await resetFilters();

      expect(mockFetch).toHaveBeenLastCalledWith("/api/listing/section-x", {
        query: { order: undefined, filters: undefined },
      });
    });
  });

  describe("changeSorting", () => {
    it("re-fetches with the sorting and keeps the applied filters", async () => {
      const id = uniqueId();
      mockFetch.mockResolvedValueOnce(listing({ filterOptionIds: ["veg"] }));
      const { changeSorting } = await mountWithListing(id, ["veg"]);

      await changeSorting("price-asc");

      expect(mockFetch).toHaveBeenLastCalledWith(`/api/listing/${id}`, {
        query: { order: "price-asc", filters: "veg" },
      });
    });
  });

  describe("derived state", () => {
    it("exposes the dishes, sortings, filters and the applied ones", async () => {
      const dishes = [dish({ id: "p1" }), dish({ id: "p2" })];
      const answer = listing({
        dishes,
        sortings: [{ key: "name-asc", label: "Name A-Z" }],
        sorting: "name-asc",
        filters: [
          {
            id: "veg",
            name: "Vegetarisch",
            options: [{ id: "ja", name: "Ja" }],
          },
        ],
        filterOptionIds: ["ja"],
      });
      mockFetch.mockResolvedValueOnce(answer);

      const state = useCategoryListing(uniqueId());
      await state.setFilters(["ja"]);
      await flushPromises();

      expect(state.dishes.value).toEqual(dishes);
      expect(state.sortings.value).toEqual(answer.sortings);
      expect(state.currentSorting.value).toBe("name-asc");
      expect(state.filters.value).toEqual(answer.filters);
      expect(state.filterOptionIds.value).toEqual(["ja"]);
    });

    it("defaults to no dishes before data loads", async () => {
      const { dishes, currentSorting } = useCategoryListing(uniqueId());
      expect(dishes.value).toEqual([]);
      expect(currentSorting.value).toBeUndefined();
    });
  });
});
