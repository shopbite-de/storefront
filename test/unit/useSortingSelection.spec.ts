import { describe, expect, it } from "vitest";
import { ref } from "vue";
import {
  SORTING_PLACEHOLDER,
  useSortingSelection,
} from "../../app/composables/useSortingSelection";

describe("useSortingSelection", () => {
  it("shows the placeholder until the listing resolves, then follows it", () => {
    const currentSortingOrder = ref<string | undefined>(undefined);
    const { currentSorting } = useSortingSelection(currentSortingOrder);

    expect(currentSorting.value).toBe(SORTING_PLACEHOLDER);

    currentSortingOrder.value = "score";
    expect(currentSorting.value).toBe("score");
  });

  it("renders the listing sorting when it is already present at setup", () => {
    const { currentSorting } = useSortingSelection(ref("score"));

    expect(currentSorting.value).toBe("score");
  });

  it("keeps the user's choice until the placeholder resets it", () => {
    const currentSortingOrder = ref<string | undefined>("score");
    const { currentSorting } = useSortingSelection(currentSortingOrder);

    currentSorting.value = "name-asc";
    expect(currentSorting.value).toBe("name-asc");

    // a later response reports another sorting, the choice wins
    currentSortingOrder.value = "price-asc";
    expect(currentSorting.value).toBe("name-asc");

    currentSorting.value = SORTING_PLACEHOLDER;
    expect(currentSorting.value).toBe("price-asc");
  });
});
