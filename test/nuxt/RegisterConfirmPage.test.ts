import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import RegisterConfirmPage from "@/pages/registrierung/bestaetigen.vue";

// The registration confirmation through the BFF (ADR 0001, step 6): the
// link's parameters go to `/api/account/register/confirm` as they came;
// refusals are domain codes.
let query: Record<string, string> = {};
mockNuxtImport("useRoute", () => () => ({ query }));

const { confirmMock, navigateToMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  navigateToMock: vi.fn(),
}));
mockNuxtImport("useCustomer", () => () => ({
  confirmRegistration: confirmMock,
}));

const refreshCartMock = vi.fn().mockResolvedValue(undefined);
mockNuxtImport("useCartData", () => () => ({ refresh: refreshCartMock }));
mockNuxtImport("navigateTo", () => navigateToMock);

async function mountPage() {
  const wrapper = await mountSuspended(RegisterConfirmPage);
  await flushPromises();
  return wrapper;
}

describe("registrierung/bestaetigen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    query = { em: "em-hash", hash: "confirm-hash" };
  });

  it("confirms, loads the cart and opens the account on success", async () => {
    confirmMock.mockResolvedValueOnce({ email: "gina@example.de" });

    await mountPage();

    expect(confirmMock).toHaveBeenCalledWith({
      em: "em-hash",
      hash: "confirm-hash",
    });
    expect(refreshCartMock).toHaveBeenCalled();
    // the wishlist moves into the account in app.vue (login watch, #467)
    // by route name, at the German path
    expect(useRouter().resolve(navigateToMock.mock.calls[0]![0]).path).toBe(
      "/konto",
    );
  });

  it("removes the confirmation hashes from the address bar", async () => {
    confirmMock.mockResolvedValueOnce({});
    const replaceMock = vi.spyOn(useRouter(), "replace");

    await mountPage();

    expect(replaceMock).toHaveBeenCalledWith({ query: {} });
    expect(replaceMock.mock.invocationCallOrder[0]).toBeLessThan(
      confirmMock.mock.invocationCallOrder[0]!,
    );
  });

  it("shows an error and stays on the page when the link is invalid", async () => {
    confirmMock.mockRejectedValueOnce(
      createError({ statusCode: 404, data: { code: "not_found" } }),
    );

    const wrapper = await mountPage();

    expect(wrapper.text()).toContain("Bestätigung fehlgeschlagen");
    expect(wrapper.text()).toContain("Kontakt");
    expect(refreshCartMock).not.toHaveBeenCalled();
    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it("tells the visitor to log in when the account is already confirmed", async () => {
    confirmMock.mockRejectedValueOnce(
      createError({ statusCode: 409, data: { code: "already_confirmed" } }),
    );

    const wrapper = await mountPage();

    expect(wrapper.text()).toContain("Konto bereits bestätigt");
    expect(wrapper.text()).toContain("Zur Anmeldung");
    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it("does not call the BFF when the link parameters are missing", async () => {
    query = { em: "em-hash" };

    const wrapper = await mountPage();

    expect(confirmMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Bestätigung fehlgeschlagen");
    expect(navigateToMock).not.toHaveBeenCalled();
  });
});
