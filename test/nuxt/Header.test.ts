import { describe, it, expect, vi } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import Header from "~/components/Header.vue";
import { ref } from "vue";

mockNuxtImport("useHeaderNavigation", () => () => ({
  navi: ref([{ label: "Home", to: "/" }]),
}));

mockNuxtImport("useUser", () => () => ({
  isLoggedIn: ref(false),
  isGuestSession: ref(false),
  user: ref(null),
  logout: vi.fn(),
}));

mockNuxtImport("useShopBiteConfig", () => () => ({
  isCheckoutEnabled: ref(true),
}));

mockNuxtImport("useCart", () => () => ({
  count: ref(0),
}));

mockNuxtImport("useToast", () => () => ({
  add: vi.fn(),
}));

mockNuxtImport("useRuntimeConfig", () => () => ({
  app: { baseURL: "/" },
  public: { site: { name: "ShopBite" } },
}));

// Mock Nuxt Content queryCollection
mockNuxtImport("queryCollection", () => (collection: string) => ({
  first: () =>
    Promise.resolve({
      account: {
        loggedIn: [],
        loggedOut: [],
      },
    }),
}));

describe("Header", () => {
  it("renders structure correctly", async () => {
    const component = await mountSuspended(Header);

    const srOnlySiteName = component.find(".sr-only");
    expect(srOnlySiteName.exists()).toBe(true);
    expect(srOnlySiteName.text()).toBe("ShopBite");
    expect(component.html()).toContain("i-lucide:phone");
    expect(component.html()).toContain("i-lucide:shopping-cart");

    const navMenu = component.findComponent({ name: "UNavigationMenu" });
    expect(navMenu.exists()).toBe(true);
  });

  it("renders login slideover", async () => {
    const component = await mountSuspended(Header);

    // USlideover might not be directly in HTML if it uses teleport and is closed
    const slideover = component.findComponent({ name: "USlideover" });
    expect(slideover.exists()).toBe(true);
    expect(slideover.props("title")).toBe("Konto");
  });
});
