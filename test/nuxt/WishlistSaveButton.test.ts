import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import WishlistSaveButton from "~/components/WishlistSaveButton.vue";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke },
}));
mockNuxtImport("useUser", () => () => ({ isLoggedIn: ref(false) }));

const selection = {
  productId: "p1",
  productNumber: "21",
  without: ["Pilze"],
  extras: ["X1"],
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
      { productId: "p1", without: ["Pilze"], extras: ["X1"] },
    ]);
  });

  it("is not pressed for another configuration of the same dish", async () => {
    await useWishlistEntries().add(selection);
    const wrapper = await mountSuspended(WishlistSaveButton, {
      props: { selection: { ...selection, extras: [] }, name: "Pizza Mix" },
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
