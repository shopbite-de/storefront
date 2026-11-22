import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mountSuspended,
  mockNuxtImport,
  registerEndpoint,
} from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { readBody, type H3Event } from "h3";
import AddressForm from "~/components/Address/Form.vue";
import AddressesPage from "~/pages/konto/adressen.vue";
import ProfilePage from "~/pages/konto/profil.vue";
import OrdersPage from "~/pages/konto/bestellungen.vue";
import AccountPage from "~/pages/konto/index.vue";
import type { Address, Customer } from "../../shared/domain";

// Account pages and the one address form (#445) on the BFF (ADR 0001,
// step 6): domain addresses and customer, no Shopware shapes.
const mocks = vi.hoisted(() => ({
  addresses: vi.fn(),
  createAddress: vi.fn(),
  patchAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefault: vi.fn(),
  profile: vi.fn(),
  email: vi.fn(),
  password: vi.fn(),
  deleteAccount: vi.fn(),
  orders: vi.fn(),
  save: vi.fn(),
}));

const home: Address = {
  id: "addr-home",
  salutation: null,
  firstName: "Gina",
  lastName: "Rossi",
  company: null,
  department: null,
  street: "Musterstr. 1",
  additionalLine: null,
  postalCode: "12345",
  city: "Musterstadt",
  country: "DE",
  phone: "0123 456789",
};
const office: Address = {
  ...home,
  id: "addr-office",
  street: "Waldstr. 1",
  company: "Rossi GmbH",
};
const gina: Customer = {
  id: "customer-1",
  guest: false,
  email: "gina@example.de",
  salutation: null,
  firstName: "Gina",
  lastName: "Rossi",
  phone: "0123 456789",
  defaultBillingAddressId: "addr-home",
  defaultDeliveryAddressId: "addr-home",
};

registerEndpoint("/api/account", {
  method: "GET",
  handler: () => ({ customer: gina }),
});
registerEndpoint("/api/account/addresses", {
  method: "GET",
  handler: () => mocks.addresses(),
});
registerEndpoint("/api/account/addresses", {
  method: "POST",
  handler: async (event: H3Event) => mocks.createAddress(await readBody(event)),
});
registerEndpoint("/api/account/addresses/addr-office", {
  method: "PATCH",
  handler: async (event: H3Event) => mocks.patchAddress(await readBody(event)),
});
registerEndpoint("/api/account/addresses/addr-office", {
  method: "DELETE",
  handler: () => mocks.deleteAddress(),
});
registerEndpoint("/api/account/addresses/addr-office/default", {
  method: "POST",
  handler: async (event: H3Event) => mocks.setDefault(await readBody(event)),
});
registerEndpoint("/api/account/profile", {
  method: "PATCH",
  handler: async (event: H3Event) => mocks.profile(await readBody(event)),
});
registerEndpoint("/api/account/email", {
  method: "POST",
  handler: async (event: H3Event) => mocks.email(await readBody(event)),
});
registerEndpoint("/api/account/password", {
  method: "POST",
  handler: async (event: H3Event) => mocks.password(await readBody(event)),
});
registerEndpoint("/api/account", {
  method: "DELETE",
  handler: () => mocks.deleteAccount(),
});
registerEndpoint("/api/account/orders", {
  method: "GET",
  handler: () => mocks.orders(),
});

mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  menuView: "bon",
}));
mockNuxtImport("useAddressAutocomplete", () => () => ({
  getSuggestions: vi.fn().mockResolvedValue([]),
}));

/** A refusal of the BFF as the route answers it. */
const refusal = (statusCode: number, code: string) =>
  createError({ statusCode, data: { code } });

describe("account pages with a preset (#445, ADR 0001 step 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.addresses.mockResolvedValue([home, office]);
    useState<Customer | null>("customer").value = gina;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("checks a new address before saving it as a domain address", async () => {
    mocks.save.mockResolvedValue(undefined);
    const wrapper = await mountSuspended(AddressForm, {
      props: { save: mocks.save },
    });
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("Bitte geben Sie den Vornamen an.");
    expect(wrapper.text()).toContain("Bitte geben Sie die Postleitzahl an.");
    expect(mocks.save).not.toHaveBeenCalled();

    const fill = (name: string, value: string) =>
      wrapper.find(`input[name="shippingAddress.${name}"]`).setValue(value);
    await fill("firstName", "Gina");
    await fill("lastName", "Rossi");
    await fill("street", "Musterstr. 1");
    await fill("zipcode", "12345");
    await fill("city", "Musterstadt");
    await fill("phoneNumber", "0123 456789");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(mocks.save).toHaveBeenCalledWith({
      id: null,
      salutation: null,
      firstName: "Gina",
      lastName: "Rossi",
      company: null,
      department: null,
      street: "Musterstr. 1",
      additionalLine: null,
      postalCode: "12345",
      city: "Musterstadt",
      // the shop's country
      country: null,
      phone: "0123 456789",
    });
    expect(wrapper.emitted("submit-success")).toHaveLength(1);
  });

  it("changes an address and keeps its company and country", async () => {
    mocks.save.mockResolvedValue(undefined);
    const wrapper = await mountSuspended(AddressForm, {
      props: { address: office, save: mocks.save },
    });
    expect(
      (
        wrapper.find('input[name="shippingAddress.company"]')
          .element as HTMLInputElement
      ).value,
    ).toBe("Rossi GmbH");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "addr-office",
        company: "Rossi GmbH",
        country: "DE",
      }),
    );
  });

  it("shows a failed save in the form", async () => {
    mocks.save.mockRejectedValue(refusal(503, "backend_unavailable"));
    const wrapper = await mountSuspended(AddressForm, {
      props: { address: home, save: mocks.save },
    });
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain(
      "Die Adresse konnte nicht gespeichert werden.",
    );
  });

  it("lists the addresses with their use and named actions", async () => {
    mocks.setDefault.mockResolvedValue({
      ...gina,
      defaultDeliveryAddressId: "addr-office",
    });
    const wrapper = await mountSuspended(AddressesPage);
    await vi.waitFor(() => expect(wrapper.findAll("address")).toHaveLength(2));
    const cards = wrapper
      .findAll("main li, ul > li")
      .filter((li) => li.find("address").exists());
    expect(cards).toHaveLength(2);
    expect(cards[0]!.text()).toContain("Lieferadresse");
    expect(cards[0]!.text()).toContain("Rechnungsadresse");
    // a default address cannot be deleted
    expect(
      cards[0]!.findAll("button").some((b) => b.text().startsWith("Löschen")),
    ).toBe(false);

    const makeShipping = cards[1]!
      .findAll("button")
      .find((b) => b.text().startsWith("Als Lieferadresse"))!;
    expect(makeShipping.text()).toContain("Waldstr. 1, Musterstadt");
    await makeShipping.trigger("click");
    await vi.waitFor(() =>
      expect(wrapper.find('[role="status"]').text()).toBe(
        "Die Lieferadresse ist geändert.",
      ),
    );
    expect(mocks.setDefault).toHaveBeenCalledWith({ use: "delivery" });
  });

  it("deletes an address that is no default after a confirmation", async () => {
    mocks.deleteAddress.mockResolvedValue(null);
    const wrapper = await mountSuspended(AddressesPage, {
      attachTo: document.body,
    });
    await vi.waitFor(() => expect(wrapper.findAll("address")).toHaveLength(2));
    const remove = wrapper
      .findAll("button")
      .find(
        (b) =>
          b.text().startsWith("Löschen") && b.text().includes("Waldstr. 1"),
      )!;
    await remove.trigger("click");
    await flushPromises();
    expect(mocks.deleteAddress).not.toHaveBeenCalled();
    mocks.addresses.mockResolvedValue([home]);
    const confirm = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Adresse löschen",
    )!;
    confirm.click();
    await vi.waitFor(() =>
      expect(wrapper.find('[role="status"]').text()).toBe(
        "Die Adresse ist gelöscht.",
      ),
    );
    expect(mocks.deleteAddress).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("validates the profile and saves the names", async () => {
    mocks.profile.mockResolvedValue({ ...gina, firstName: "Regina" });
    const wrapper = await mountSuspended(ProfilePage);
    await flushPromises();
    const form = wrapper.find('form[aria-labelledby="profil-daten"]');
    await form.find('input[name="email"]').setValue("keine-mail");
    await form.trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain(
      "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    );
    expect(mocks.profile).not.toHaveBeenCalled();

    await form.find('input[name="email"]').setValue("gina@example.de");
    await form.find('input[name="firstName"]').setValue("Regina");
    await form.trigger("submit");
    await vi.waitFor(() =>
      expect(form.find('[role="status"]').text()).toBe(
        "Ihre Änderungen sind gespeichert.",
      ),
    );
    expect(mocks.email).not.toHaveBeenCalled();
    expect(mocks.profile).toHaveBeenCalledWith({
      firstName: "Regina",
      lastName: "Rossi",
    });
  });

  it("tells a changed password whose login afterwards failed", async () => {
    mocks.password.mockResolvedValue({ loggedIn: false });
    const wrapper = await mountSuspended(ProfilePage);
    await flushPromises();
    const form = wrapper.find('form[aria-labelledby="passwort-aendern"]');
    await form.find('input[name="currentPassword"]').setValue("alt-geheim-1");
    await form.find('input[name="newPassword"]').setValue("neu-geheim-2");
    await form
      .find('input[name="newPasswordConfirm"]')
      .setValue("neu-geheim-2");
    await form.trigger("submit");
    await vi.waitFor(() =>
      expect(form.text()).toContain(
        "Bitte melden Sie sich mit dem neuen Passwort wieder an.",
      ),
    );
    expect(form.text()).toContain("Ihr Passwort ist geändert.");
    expect(form.find('[role="alert"]').exists()).toBe(false);
  });

  it("changes the e-mail only with the password", async () => {
    mocks.profile.mockResolvedValue(gina);
    mocks.email.mockRejectedValueOnce(refusal(401, "invalid_credentials"));
    const wrapper = await mountSuspended(ProfilePage);
    await flushPromises();
    const form = wrapper.find('form[aria-labelledby="profil-daten"]');
    expect(form.find('input[name="emailPassword"]').exists()).toBe(false);
    await form.find('input[name="email"]').setValue("regina@example.de");
    await flushPromises();
    await form.trigger("submit");
    await flushPromises();
    expect(form.text()).toContain(
      "Bitte geben Sie Ihr Passwort zur Bestätigung an.",
    );
    expect(mocks.email).not.toHaveBeenCalled();

    await form.find('input[name="emailPassword"]').setValue("falsch-123");
    await form.trigger("submit");
    await vi.waitFor(() =>
      expect(form.find('[role="alert"]').text()).toContain(
        "Das Passwort stimmt nicht.",
      ),
    );
    expect(mocks.email).toHaveBeenCalledWith({
      email: "regina@example.de",
      password: "falsch-123",
    });

    mocks.email.mockResolvedValue({ ...gina, email: "regina@example.de" });
    await form.find('input[name="emailPassword"]').setValue("richtig-123");
    await form.trigger("submit");
    await vi.waitFor(() =>
      expect(form.find('[role="status"]').text()).toBe(
        "Ihre Änderungen sind gespeichert.",
      ),
    );
    // only the e-mail changed: no profile request
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it("changes the password with the current one", async () => {
    mocks.password.mockResolvedValue({ loggedIn: true });
    const wrapper = await mountSuspended(ProfilePage);
    await flushPromises();
    const form = wrapper.find('form[aria-labelledby="passwort-aendern"]');
    await form.find('input[name="currentPassword"]').setValue("alt-geheim-1");
    await form.find('input[name="newPassword"]').setValue("kurz");
    await form.find('input[name="newPasswordConfirm"]').setValue("kurz");
    await form.trigger("submit");
    await flushPromises();
    expect(form.text()).toContain("mindestens 8 Zeichen");
    expect(mocks.password).not.toHaveBeenCalled();

    await form.find('input[name="newPassword"]').setValue("neu-geheim-2");
    await form
      .find('input[name="newPasswordConfirm"]')
      .setValue("neu-geheim-2");
    await form.trigger("submit");
    await vi.waitFor(() =>
      expect(form.text()).toContain("Ihr Passwort ist geändert."),
    );
    expect(mocks.password).toHaveBeenCalledWith({
      currentPassword: "alt-geheim-1",
      newPassword: "neu-geheim-2",
    });
    expect(form.text()).toContain("Ihr Passwort ist geändert.");
  });

  it("shows the greeting and the default addresses", async () => {
    const wrapper = await mountSuspended(AccountPage);
    await vi.waitFor(() => expect(wrapper.text()).toContain("Musterstr. 1"));
    expect(wrapper.text()).toContain("Hallo Gina");
    expect(wrapper.text()).toContain("gina@example.de");
    expect(wrapper.text()).toContain("Liefer- und Rechnungsadresse");
    expect(wrapper.text()).toContain("Musterstr. 1");
  });

  it("lists the orders with number, total, date and status", async () => {
    mocks.orders.mockResolvedValue({
      orders: [
        {
          id: "order-1",
          number: "10042",
          placedAt: "2026-11-21T16:00:00.000Z",
          status: "open",
          total: { amountMinor: 2350, currency: "EUR" },
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
    });
    const wrapper = await mountSuspended(OrdersPage);
    await vi.waitFor(() =>
      expect(wrapper.find('a[href="/konto/bestellung/order-1"]').exists()).toBe(
        true,
      ),
    );
    const link = wrapper.find('a[href="/konto/bestellung/order-1"]');
    expect(link.text()).toContain("Bestellung 10042");
    expect(link.text()).toContain("23,50");
    expect(link.text()).toContain("21.11.2026");
    expect(link.text()).toContain("Offen");
  });

  it("says when there are no orders", async () => {
    mocks.orders.mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      limit: 100,
    });
    const wrapper = await mountSuspended(OrdersPage);
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain("Sie haben noch nichts bestellt."),
    );
  });
});
