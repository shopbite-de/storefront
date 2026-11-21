import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { readBody, type H3Event } from "h3";
import { useCustomer } from "~/composables/useCustomer";

// The session's customer through the BFF (ADR 0001, step 6).
const mocks = vi.hoisted(() => ({
  customer: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  confirm: vi.fn(),
}));

registerEndpoint("/api/account", {
  method: "GET",
  handler: () => mocks.customer(),
});
registerEndpoint("/api/account/login", {
  method: "POST",
  handler: async (event: H3Event) => mocks.login(await readBody(event)),
});
registerEndpoint("/api/account/logout", {
  method: "POST",
  handler: () => mocks.logout(),
});
registerEndpoint("/api/account/register", {
  method: "POST",
  handler: async (event: H3Event) => mocks.register(await readBody(event)),
});
registerEndpoint("/api/account/register/confirm", {
  method: "POST",
  handler: async (event: H3Event) => mocks.confirm(await readBody(event)),
});

const gina = { id: "c1", guest: false, email: "gina@example.de" };

describe("useCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useState("customer").value = undefined;
  });

  it("loads the session's customer: a visitor, a guest, a customer", async () => {
    const { refresh, isLoggedIn, isGuest, loaded } = useCustomer();
    expect(loaded.value).toBe(false);
    mocks.customer.mockResolvedValueOnce({ customer: null });
    expect(await refresh()).toBeNull();
    expect(loaded.value).toBe(true);
    expect(isLoggedIn.value).toBe(false);

    mocks.customer.mockResolvedValueOnce({
      customer: { ...gina, guest: true },
    });
    await refresh();
    expect(isGuest.value).toBe(true);
    expect(isLoggedIn.value).toBe(false);

    mocks.customer.mockResolvedValueOnce({ customer: gina });
    await refresh();
    expect(isLoggedIn.value).toBe(true);
  });

  it("logs in and out", async () => {
    mocks.login.mockResolvedValue(gina);
    mocks.logout.mockResolvedValue(null);
    const { login, logout, customer, isLoggedIn } = useCustomer();
    await login("gina@example.de", "geheim-123");
    expect(mocks.login).toHaveBeenCalledWith({
      email: "gina@example.de",
      password: "geheim-123",
    });
    expect(customer.value).toEqual(gina);
    expect(isLoggedIn.value).toBe(true);
    await logout();
    expect(customer.value).toBeNull();
  });

  it("forgets the previous customer's addresses and orders on login and logout", async () => {
    mocks.login.mockResolvedValue(gina);
    mocks.logout.mockResolvedValue(null);
    const addresses = useState<unknown>("account-addresses");
    const orders = useState<unknown>("account-orders");
    const { login, logout } = useCustomer();
    addresses.value = [{ id: "previous" }];
    orders.value = { orders: [{ id: "previous" }] };
    await login("gina@example.de", "geheim-123");
    expect(addresses.value).toBeNull();
    expect(orders.value).toBeNull();
    addresses.value = [{ id: "gina's" }];
    orders.value = { orders: [{ id: "gina's" }] };
    await logout();
    expect(addresses.value).toBeNull();
    expect(orders.value).toBeNull();
  });

  it("sends a login again after an outdated session, once answered", async () => {
    mocks.login
      .mockRejectedValueOnce(
        createError({ statusCode: 409, data: { code: "stale_session" } }),
      )
      .mockResolvedValueOnce(gina);
    const { login, isLoggedIn } = useCustomer();
    await login("gina@example.de", "geheim-123");
    expect(mocks.login).toHaveBeenCalledTimes(2);
    expect(isLoggedIn.value).toBe(true);
  });

  it("stays logged out after a registration that waits for its confirmation", async () => {
    mocks.register.mockResolvedValue({
      customer: gina,
      confirmationRequired: true,
    });
    const { register, isLoggedIn } = useCustomer();
    const answer = await register({
      email: "gina@example.de",
      password: "geheim-123",
    } as Parameters<typeof register>[0]);
    expect(answer.confirmationRequired).toBe(true);
    expect(isLoggedIn.value).toBe(false);

    mocks.confirm.mockResolvedValue(gina);
    await useCustomer().confirmRegistration({ em: "a", hash: "b" });
    expect(mocks.confirm).toHaveBeenCalledWith({ em: "a", hash: "b" });
    expect(isLoggedIn.value).toBe(true);
  });
});
