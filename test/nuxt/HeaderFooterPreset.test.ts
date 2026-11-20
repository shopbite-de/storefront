import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { computed, reactive, ref } from "vue";
import Header from "~/components/Header.vue";
import Footer from "~/components/Footer.vue";

// Header and footer of a shop with a style preset (#455).
const mocks = vi.hoisted(() => ({
  show: vi.fn(),
  logout: vi.fn(),
}));
const state = reactive({ cartCount: 2, wishlistCount: 0, loggedIn: false });

mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  menuView: "bon",
  colorMode: "light",
}));
mockNuxtImport("useNavigation", () => () => ({
  mainMenu: ref([
    { label: "Speisekarte", to: "/speisekarte/" },
    { label: "Kontakt", to: "/kontakt" },
  ]),
  footerMenu: ref([
    {
      label: "Rechtliches",
      children: [
        { label: "Impressum", to: "/impressum" },
        { label: "Datenschutz", to: "/datenschutz" },
      ],
    },
    { label: "Leer", children: [] },
  ]),
}));
mockNuxtImport("useCartQuickView", () => () => ({
  open: ref(false),
  mounted: ref(false),
  show: mocks.show,
}));
mockNuxtImport("useCart", () => () => ({
  count: computed(() => state.cartCount),
}));
mockNuxtImport("useWishlist", () => () => ({
  count: computed(() => state.wishlistCount),
}));
mockNuxtImport("useShopConfig", () => () => ({
  acceptsOrders: ref(true),
}));
function userApi() {
  return {
    isLoggedIn: computed(() => state.loggedIn),
    isGuestSession: computed(() => false),
    logout: mocks.logout,
  };
}
mockNuxtImport("useUser", () => () => userApi());
// Header.vue imports useUser from the package; since @shopware/composables
// 1.15 the auto-import mock above no longer reaches that import.
vi.mock("@shopware/composables", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@shopware/composables")>()),
  useUser: () => userApi(),
}));
mockNuxtImport("useStoreStatus", () => () => ({ status: ref(null) }));
mockNuxtImport("useOpeningHours", () => () => ({
  openingHours: ref({ intervals: [] }),
  refresh: vi.fn(),
}));

describe("header and footer with a preset (#455)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.cartCount = 2;
    state.wishlistCount = 0;
    state.loggedIn = false;
    Object.assign(useRuntimeConfig().public.site, {
      name: "Esempio",
      telephone: "0123 456789",
      address: {
        street: "Musterstraße 1",
        postalCode: "12345",
        city: "Musterstadt",
        country: "DE",
      },
      googleBusinessProfileUrl: "",
    });
  });

  it("names the logo link and the icon-only controls", async () => {
    const wrapper = await mountSuspended(Header);
    expect(
      wrapper.find('a[aria-label="Esempio, zur Startseite"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('a[href="tel:0123456789"]').attributes("aria-label"),
    ).toBe("Anrufen: 0123 456789");
    expect(wrapper.find('a[href="/anmelden"]').attributes("aria-label")).toBe(
      "Anmelden",
    );
    expect(wrapper.find('button[aria-label="Menü öffnen"]').exists()).toBe(
      true,
    );
  });

  it("lists the main navigation in a labelled nav", async () => {
    const wrapper = await mountSuspended(Header);
    const nav = wrapper.find('nav[aria-label="Hauptnavigation"]');
    expect(nav.findAll("a").map((link) => link.text())).toEqual([
      "Speisekarte",
      "Kontakt",
    ]);
  });

  it("opens the cart sheet from the cart button with the count in its name", async () => {
    const wrapper = await mountSuspended(Header);
    const cart = wrapper.find('button[aria-label="Warenkorb, 2 Artikel"]');
    expect(cart.attributes("aria-haspopup")).toBe("dialog");
    await cart.trigger("click");
    expect(mocks.show).toHaveBeenCalled();
  });

  it("links the account button to the account when logged in", async () => {
    state.loggedIn = true;
    const wrapper = await mountSuspended(Header);
    expect(wrapper.find('a[href="/konto"]').attributes("aria-label")).toBe(
      "Mein Konto",
    );
  });

  it("shows contact data and the footer columns without a colour switch", async () => {
    const wrapper = await mountSuspended(Footer);
    expect(wrapper.find("address").text()).toContain("Musterstraße 1");
    expect(wrapper.find("address").text()).toContain("12345 Musterstadt");
    const navs = wrapper.findAll("nav");
    expect(navs.map((nav) => nav.attributes("aria-label"))).toEqual([
      "Rechtliches",
    ]);
    expect(navs[0]!.findAll("a").map((link) => link.text())).toEqual([
      "Impressum",
      "Datenschutz",
    ]);
    expect(wrapper.text()).not.toContain("Dark");
  });
});
