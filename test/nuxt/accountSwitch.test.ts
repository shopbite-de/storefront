import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { useAccountAddresses } from "~/composables/useAccountAddresses";
import { useAccountOrders } from "~/composables/useAccountOrders";
import { useCustomer } from "~/composables/useCustomer";

// A customer switch in one tab (step 6 review): a read of the customer
// before that answers late never shows up for the next one.
const mocks = vi.hoisted(() => ({
  addresses: vi.fn(),
  orders: vi.fn(),
  customer: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  password: vi.fn(),
}));
registerEndpoint("/api/account/addresses", {
  method: "GET",
  handler: () => mocks.addresses(),
});
registerEndpoint("/api/account/orders", {
  method: "GET",
  handler: () => mocks.orders(),
});
registerEndpoint("/api/account", {
  method: "GET",
  handler: () => mocks.customer(),
});
registerEndpoint("/api/account/login", {
  method: "POST",
  handler: () => mocks.login(),
});
registerEndpoint("/api/account/logout", {
  method: "POST",
  handler: () => mocks.logout(),
});
registerEndpoint("/api/account/password", {
  method: "POST",
  handler: () => mocks.password(),
});

const anna = { id: "anna", guest: false, email: "anna@example.de" };
const ben = { id: "ben", guest: false, email: "ben@example.de" };

function later<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

describe("a customer switch in one tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useState("customer").value = anna;
    useState("account-addresses").value = null;
    useState("account-orders").value = null;
    mocks.logout.mockResolvedValue(null);
    mocks.login.mockResolvedValue(ben);
  });

  it("drops the late addresses and orders of the customer before", async () => {
    const addresses = later<unknown>();
    const orders = later<unknown>();
    mocks.addresses.mockReturnValueOnce(addresses.promise);
    mocks.orders.mockReturnValueOnce(orders.promise);
    const book = useAccountAddresses();
    const list = useAccountOrders();
    const pendingAddresses = book.refresh().catch(() => null);
    const pendingOrders = list.load().catch(() => null);
    await vi.waitFor(() => expect(mocks.addresses).toHaveBeenCalled());
    await vi.waitFor(() => expect(mocks.orders).toHaveBeenCalled());

    const { logout, login, customer } = useCustomer();
    await logout();
    await login("ben@example.de", "geheim-123");
    addresses.resolve([{ id: "anna-home", street: "Annaweg 1" }]);
    orders.resolve({ orders: [{ id: "anna-order" }], total: 1, page: 1 });
    await pendingAddresses;
    await pendingOrders;

    expect(customer.value).toEqual(ben);
    expect(book.addresses.value).toBeNull();
    expect(list.orders.value).toBeNull();
  });

  it("keeps the next customer when a read of the customer before answers late", async () => {
    const answer = later<unknown>();
    mocks.customer.mockReturnValueOnce(answer.promise);
    const { refresh, login, customer } = useCustomer();
    const pending = refresh().catch(() => null);
    await vi.waitFor(() => expect(mocks.customer).toHaveBeenCalled());
    await login("ben@example.de", "geheim-123");
    answer.resolve({ customer: anna });
    await pending;
    expect(customer.value).toEqual(ben);
  });

  it("shows the tab logged out after a password change without login", async () => {
    mocks.password.mockResolvedValue({ loggedIn: false });
    const { changePassword, isLoggedIn } = useCustomer();
    expect(await changePassword("alt-geheim-1", "neu-geheim-2")).toEqual({
      loggedIn: false,
    });
    expect(isLoggedIn.value).toBe(false);
  });
});
