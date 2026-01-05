import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import Header from "~/components/Header.vue";
import { ref, reactive, toRefs } from "vue";

const mocks = vi.hoisted(() => ({
  state: {
    isLoggedIn: false,
    isGuestSession: false,
    user: null as any,
  },
  logout: vi.fn(),
}));

const reactiveState = reactive(mocks.state);

mockNuxtImport("useUser", () => () => ({
  ...toRefs(reactiveState),
  logout: mocks.logout,
}));

mockNuxtImport("useShopBiteConfig", () => () => ({
  isCheckoutEnabled: ref(true),
}));

mockNuxtImport("useCart", () => () => ({
  count: ref(0),
}));

mockNuxtImport("useRuntimeConfig", () => () => ({
  app: {
    baseURL: "/",
  },
  public: {
    site: {
      name: "ShopBite",
    },
    shopware: {
      devStorefrontUrl: "http://localhost:3000",
    },
  },
}));

// Mock Nuxt Content queryCollection
mockNuxtImport("queryCollection", () => (collection: string) => ({
  first: () =>
    Promise.resolve({
      main: [],
      account: {
        loggedIn: [
          [{ label: "Mein Konto", type: "label" }],
          [
            { label: "Konto", icon: "i-lucide-user", to: "/konto" },
            {
              label: "Bestellungen",
              icon: "i-lucide-pizza",
              to: "/konto/bestellungen",
            },
          ],
          [{ label: "Abmelden", icon: "i-lucide-log-out", action: "logout" }],
        ],
        loggedOut: [
          [{ label: "Jetzt anmelden", type: "label" }],
          [{ label: "Zur Anmeldung", icon: "i-lucide-user", to: "/anmelden" }],
        ],
      },
    }),
}));

describe("Header", () => {
  beforeEach(() => {
    reactiveState.isLoggedIn = false;
    reactiveState.isGuestSession = false;
    reactiveState.user = null;
    vi.clearAllMocks();
  });

  it("renders correctly when logged out", async () => {
    const component = await mountSuspended(Header);
    // Should show user icon
    expect(component.html()).toContain("i-lucide:user");
    // Should NOT show checkmark chip
    expect(component.html()).not.toContain("✓");
  });

  it("renders correctly when logged in", async () => {
    reactiveState.isLoggedIn = true;
    reactiveState.user = { firstName: "John", lastName: "Doe" };
    const component = await mountSuspended(Header);

    // Should show checkmark chip
    expect(component.html()).toContain("✓");
  });

  it("renders correctly for guest session", async () => {
    reactiveState.isGuestSession = true;
    reactiveState.user = { firstName: "Guest", lastName: "User" };
    const component = await mountSuspended(Header);

    // Should show checkmark chip for guest session too
    expect(component.html()).toContain("✓");
  });

  it("filters menu items for guest session", async () => {
    reactiveState.isGuestSession = true;
    reactiveState.user = { firstName: "Guest", lastName: "User" };
    const component = await mountSuspended(Header);

    // Find the dropdown menu
    const dropdown = component.findComponent({ name: "UDropdownMenu" });
    expect(dropdown.exists()).toBe(true);

    const items = dropdown.props("items");

    // Group 0 should have the user label
    // Group 1 should be gone (filtered out because it only contained links)
    // Group 2 (now index 1) should have logout
    expect(items.length).toBe(2);
    expect(items[0][0].label).toBe("Guest User");
    expect(items[1][0].label).toBe("Abmelden");
    expect(items[1][0].onSelect).toBeDefined();
  });
});
