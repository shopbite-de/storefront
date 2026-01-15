import { describe, it, expect } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import HeaderBody from "~/components/Header/Body.vue";
import { ref } from "vue";

const mockNavi = [
  { label: "Home", to: "/", icon: "i-lucide-home" },
  { label: "Products", to: "/products", icon: "i-lucide-package" },
];

mockNuxtImport("useHeaderNavigation", () => () => ({
  navi: ref(mockNavi),
}));

describe("HeaderBody", () => {
  it("renders navigation menu with correct items", async () => {
    const component = await mountSuspended(HeaderBody);
    const navMenu = component.findComponent({ name: "UNavigationMenu" });

    expect(navMenu.exists()).toBe(true);
    expect(navMenu.props("items")).toEqual(mockNavi);
    expect(navMenu.props("orientation")).toBe("vertical");
  });

  it("renders SalesChannelSwitch", async () => {
    const component = await mountSuspended(HeaderBody);
    const switchComponent = component.findComponent({
      name: "SalesChannelSwitch",
    });

    expect(switchComponent.exists()).toBe(true);
  });
});
