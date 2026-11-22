import { describe, it, expect, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import WishlistSaveButton from "~/components/WishlistSaveButton.vue";

mockNuxtImport("useCustomer", () => () => ({ isLoggedIn: ref(false) }));

const selection = {
  configuration: {
    dishId: "p1",
    variantId: null,
    extraIds: ["x1"],
    removedIngredientIds: ["i-pilze"],
  },
  dishNumber: "21",
};

describe("WishlistSaveButton (#467)", () => {
  beforeEach(() => {
    localStorage.clear();
    useWishlistEntries().entries.value = [];
  });

  it("saves the configuration and shows it as pressed", async () => {
    const wrapper = await mountSuspended(WishlistSaveButton, {
      props: { selection, name: "Pizza Mix" },
    });
    const button = wrapper.get("button");
    expect(button.attributes("aria-label")).toBe("Pizza Mix merken");
    expect(button.attributes("aria-pressed")).toBe("false");

    await button.trigger("click");
    await flushPromises();

    expect(button.attributes("aria-pressed")).toBe("true");
    expect(useWishlistEntries().entries.value).toMatchObject([
      { configuration: selection.configuration, dishNumber: "21" },
    ]);
  });

  it("is not pressed for another configuration of the same dish", async () => {
    await useWishlistEntries().add(selection);
    const wrapper = await mountSuspended(WishlistSaveButton, {
      props: {
        selection: {
          ...selection,
          configuration: { ...selection.configuration, extraIds: [] },
        },
        name: "Pizza Mix",
      },
    });

    expect(wrapper.get("button").attributes("aria-pressed")).toBe("false");

    await wrapper.setProps({ selection });
    expect(wrapper.get("button").attributes("aria-pressed")).toBe("true");
  });

  it("removes the saved configuration on a second click", async () => {
    await useWishlistEntries().add(selection);
    const wrapper = await mountSuspended(WishlistSaveButton, {
      props: { selection, name: "Pizza Mix" },
    });

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(wrapper.get("button").attributes("aria-pressed")).toBe("false");
    expect(useWishlistEntries().entries.value).toEqual([]);
  });
});
