import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import AddressFormPreset from "~/components/Address/FormPreset.vue";
import AddressesPage from "~/pages/konto/adressen.vue";
import ProfilePage from "~/pages/konto/profil.vue";
import type { Schemas } from "#shopware";

// Account pages and the address form of the presets (#445).
const mocks = vi.hoisted(() => ({
  createCustomerAddress: vi.fn(),
  updateCustomerAddress: vi.fn(),
  setDefaultCustomerShippingAddress: vi.fn(),
  setDefaultCustomerBillingAddress: vi.fn(),
  loadCustomerAddresses: vi.fn(),
  refreshUser: vi.fn(),
  updatePersonalInfo: vi.fn(),
  updateEmail: vi.fn(),
  logout: vi.fn(),
  invoke: vi.fn(),
}));

const home = {
  id: "addr-home",
  firstName: "Gina",
  lastName: "Rossi",
  street: "Kantstr. 6",
  zipcode: "63179",
  city: "Obertshausen",
  phoneNumber: "06104 71427",
  countryId: "de",
} as Schemas["CustomerAddress"];
const office = {
  ...home,
  id: "addr-office",
  street: "Waldstr. 1",
  company: "Rossi GmbH",
} as Schemas["CustomerAddress"];

const user = ref({
  firstName: "Gina",
  lastName: "Rossi",
  email: "gina@example.de",
});
const userApi = () => ({
  user,
  isLoggedIn: ref(true),
  userDefaultShippingAddress: ref(home),
  userDefaultBillingAddress: ref(home),
  refreshUser: mocks.refreshUser,
  updatePersonalInfo: mocks.updatePersonalInfo,
  updateEmail: mocks.updateEmail,
  logout: mocks.logout,
});

vi.mock("@shopware/composables", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@shopware/composables")>()),
  useAddress: () => ({
    customerAddresses: ref([home, office]),
    loadCustomerAddresses: mocks.loadCustomerAddresses,
    createCustomerAddress: mocks.createCustomerAddress,
    updateCustomerAddress: mocks.updateCustomerAddress,
    setDefaultCustomerShippingAddress: mocks.setDefaultCustomerShippingAddress,
    setDefaultCustomerBillingAddress: mocks.setDefaultCustomerBillingAddress,
  }),
  useUser: () => userApi(),
}));
mockNuxtImport("useUser", () => () => userApi());
mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  hasPreset: true,
  menuView: "bon",
}));
mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke: mocks.invoke },
}));
mockNuxtImport("useAddressAutocomplete", () => () => ({
  getSuggestions: vi.fn().mockResolvedValue([]),
}));

describe("account pages with a preset (#445)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of Object.values(mocks)) mock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("checks a new address before creating it", async () => {
    mocks.createCustomerAddress.mockResolvedValue({ id: "new" });
    const wrapper = await mountSuspended(AddressFormPreset);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("Bitte geben Sie den Vornamen an.");
    expect(wrapper.text()).toContain("Bitte geben Sie die Postleitzahl an.");
    expect(mocks.createCustomerAddress).not.toHaveBeenCalled();

    const fill = (name: string, value: string) =>
      wrapper.find(`input[name="shippingAddress.${name}"]`).setValue(value);
    await fill("firstName", "Gina");
    await fill("lastName", "Rossi");
    await fill("street", "Kantstr. 6");
    await fill("zipcode", "63179");
    await fill("city", "Obertshausen");
    await fill("phoneNumber", "06104 71427");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(mocks.createCustomerAddress).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Gina", zipcode: "63179" }),
    );
    expect(wrapper.emitted("submit-success")?.[0]).toEqual([{ id: "new" }]);
  });

  it("updates an existing address and keeps its company", async () => {
    mocks.updateCustomerAddress.mockResolvedValue(office);
    const wrapper = await mountSuspended(AddressFormPreset, {
      props: { address: office },
    });
    expect(
      (
        wrapper.find('input[name="shippingAddress.company"]')
          .element as HTMLInputElement
      ).value,
    ).toBe("Rossi GmbH");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(mocks.updateCustomerAddress).toHaveBeenCalledWith(
      expect.objectContaining({ id: "addr-office", company: "Rossi GmbH" }),
    );
  });

  it("shows a failed save in the form", async () => {
    mocks.updateCustomerAddress.mockRejectedValue(new Error("400"));
    const wrapper = await mountSuspended(AddressFormPreset, {
      props: { address: home },
    });
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain(
      "Die Adresse konnte nicht gespeichert werden.",
    );
  });

  it("lists the addresses with their use and named actions", async () => {
    const wrapper = await mountSuspended(AddressesPage);
    await flushPromises();
    const cards = wrapper
      .findAll("main li, ul > li")
      .filter((li) => li.find("address").exists());
    expect(cards).toHaveLength(2);
    expect(cards[0]!.text()).toContain("Lieferadresse");
    expect(cards[0]!.text()).toContain("Rechnungsadresse");

    const makeShipping = cards[1]!
      .findAll("button")
      .find((b) => b.text().startsWith("Als Lieferadresse"))!;
    expect(makeShipping.text()).toContain("Waldstr. 1, Obertshausen");
    await makeShipping.trigger("click");
    await flushPromises();
    expect(mocks.setDefaultCustomerShippingAddress).toHaveBeenCalledWith(
      "addr-office",
    );
    expect(wrapper.find('[role="status"]').text()).toBe(
      "Die Lieferadresse ist geändert.",
    );
  });

  it("validates the profile and saves it", async () => {
    const wrapper = await mountSuspended(ProfilePage);
    await flushPromises();
    await wrapper.find('input[name="email"]').setValue("keine-mail");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain(
      "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    );
    expect(mocks.updatePersonalInfo).not.toHaveBeenCalled();

    await wrapper.find('input[name="email"]').setValue("gina@example.de");
    await wrapper.find('input[name="firstName"]').setValue("Regina");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(mocks.updateEmail).not.toHaveBeenCalled();
    expect(mocks.updatePersonalInfo).toHaveBeenCalledWith({
      firstName: "Regina",
      lastName: "Rossi",
    });
    expect(wrapper.find('[role="status"]').text()).toBe(
      "Ihre Änderungen sind gespeichert.",
    );
  });
});
