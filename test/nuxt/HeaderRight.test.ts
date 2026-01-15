import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import HeaderRight from "~/components/Header/Right.vue";
import { ref, reactive, computed } from "vue";

const mocks = vi.hoisted(() => ({
  state: {
    isLoggedIn: false,
    isGuestSession: false,
    user: null as any,
  },
  toastAddCalled: { value: false },
}));

const reactiveState = reactive(mocks.state);

mockNuxtImport("useUser", () => () => ({
  isLoggedIn: computed(() => reactiveState.isLoggedIn),
  isGuestSession: computed(() => reactiveState.isGuestSession),
  user: computed(() => reactiveState.user),
  logout: () => {
    reactiveState.isLoggedIn = false;
    reactiveState.user = null;
  },
}));

mockNuxtImport("useToast", () => () => ({
  add: (payload: any) => {
    if (typeof global !== "undefined" && (global as any).toastAddCalled) {
      (global as any).toastAddCalled.value = true;
    }
  },
}));

mockNuxtImport("useShopBiteConfig", () => () => ({
  isCheckoutEnabled: ref(true),
}));

mockNuxtImport("useCart", () => () => ({
  count: ref(5),
}));

mockNuxtImport("useRuntimeConfig", () => () => ({
  app: { baseURL: "/" },
}));

// Mock Nuxt Content queryCollection
mockNuxtImport("queryCollection", () => (collection: string) => ({
  first: () =>
    Promise.resolve({
      account: {
        loggedIn: [
          [{ label: "Mein Konto", type: "label" }],
          [
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

describe("HeaderRight", () => {
  beforeEach(() => {
    reactiveState.isLoggedIn = false;
    reactiveState.isGuestSession = false;
    reactiveState.user = null;
    mocks.toastAddCalled.value = false;
    (global as any).toastAddCalled = mocks.toastAddCalled;
    vi.clearAllMocks();
  });

  it("renders phone link", async () => {
    const component = await mountSuspended(HeaderRight);
    const phoneButton = component.find('a[href="tel:+49610471427"]');
    expect(phoneButton.exists()).toBe(true);
  });

  it("shows logged out dropdown items when not logged in", async () => {
    const component = await mountSuspended(HeaderRight);
    const dropdown = component.findComponent({ name: "UDropdownMenu" });
    const items = dropdown.props("items");

    expect(items[0][0].label).toBe("Jetzt anmelden");
    expect(items[1][0].to).toBe("/anmelden");
  });

  it("shows logged in dropdown items when logged in", async () => {
    reactiveState.isLoggedIn = true;
    reactiveState.user = { firstName: "Jane", lastName: "Doe" };

    const component = await mountSuspended(HeaderRight);
    const dropdown = component.findComponent({ name: "UDropdownMenu" });
    const items = dropdown.props("items");

    expect(items[0][0].label).toBe("Jane Doe");
    expect(items[1][0].to).toBe("/konto/bestellungen");
    expect(items[2][0].label).toBe("Abmelden");
  });

  it("shows cart drawer with correct count when checkout is enabled", async () => {
    const component = await mountSuspended(HeaderRight);
    const drawer = component.findComponent({ name: "UDrawer" });
    expect(drawer.exists()).toBe(true);

    const chip = component.findComponent({ name: "UChip" });
    expect(chip.props("text")).toBe(5);
  });

  it("calls logout and updates state when logout is selected", async () => {
    reactiveState.isLoggedIn = true;
    const component = await mountSuspended(HeaderRight);
    const dropdown = component.findComponent({ name: "UDropdownMenu" });
    const items = dropdown.props("items");

    // Find the item with logout handler
    let logoutItem;
    for (const group of items) {
      for (const item of group) {
        if (item.label === "Abmelden") {
          logoutItem = item;
          break;
        }
      }
    }

    expect(logoutItem).toBeDefined();
    logoutItem.onSelect();

    expect(reactiveState.isLoggedIn).toBe(false);
    expect(mocks.toastAddCalled.value).toBe(true);
  });
});
