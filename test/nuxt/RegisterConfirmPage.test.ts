import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import RegisterConfirmPage from "@/pages/registrierung/bestaetigen.vue";

const { ApiClientErrorMock } = vi.hoisted(() => ({
  ApiClientErrorMock: class extends Error {
    details: unknown;
    constructor(details: unknown) {
      super("ApiClientError");
      this.details = details;
    }
  },
}));

vi.mock("@shopware/api-client", () => ({
  ApiClientError: ApiClientErrorMock,
}));

let query: Record<string, string> = {};
mockNuxtImport("useRoute", () => () => ({ query }));

const invokeMock = vi.fn();
mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke: invokeMock },
}));

const refreshSessionContextMock = vi.fn();
mockNuxtImport("useSessionContext", () => () => ({
  refreshSessionContext: refreshSessionContextMock,
}));

const refreshCartMock = vi.fn();
mockNuxtImport("useCart", () => () => ({ refreshCart: refreshCartMock }));

const mergeWishlistProductsMock = vi.fn();
mockNuxtImport("useWishlist", () => () => ({
  mergeWishlistProducts: mergeWishlistProductsMock,
}));

const toastAddMock = vi.fn();
mockNuxtImport("useToast", () => () => ({ add: toastAddMock }));

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }));
mockNuxtImport("navigateTo", () => navigateToMock);

async function mountPage() {
  const wrapper = await mountSuspended(RegisterConfirmPage);
  await flushPromises();
  return wrapper;
}

describe("registrierung/bestaetigen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query = { em: "em-hash", hash: "confirm-hash" };
  });

  it("loads the new session and opens the account on success", async () => {
    invokeMock.mockResolvedValueOnce({ data: {} });

    await mountPage();

    expect(invokeMock).toHaveBeenCalledWith(
      "registerConfirm post /account/register-confirm",
      { body: { em: "em-hash", hash: "confirm-hash" } },
    );
    expect(refreshSessionContextMock).toHaveBeenCalled();
    expect(refreshCartMock).toHaveBeenCalled();
    expect(mergeWishlistProductsMock).toHaveBeenCalled();
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ color: "success" }),
    );
    expect(navigateToMock).toHaveBeenCalledWith({ path: "/konto" });
  });

  it("shows an error and stays on the page when the link is invalid", async () => {
    invokeMock.mockRejectedValueOnce(
      new ApiClientErrorMock({
        errors: [{ code: "CHECKOUT__CUSTOMER_NOT_FOUND_BY_HASH" }],
      }),
    );

    const wrapper = await mountPage();

    expect(wrapper.text()).toContain("Bestätigung fehlgeschlagen");
    expect(wrapper.text()).toContain("Kontakt");
    expect(refreshSessionContextMock).not.toHaveBeenCalled();
    expect(toastAddMock).not.toHaveBeenCalled();
    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it("tells the visitor to log in when the account is already confirmed", async () => {
    invokeMock.mockRejectedValueOnce(
      new ApiClientErrorMock({
        errors: [{ code: "CHECKOUT__CUSTOMER_IS_ALREADY_CONFIRMED" }],
      }),
    );

    const wrapper = await mountPage();

    expect(wrapper.text()).toContain("Konto bereits bestätigt");
    expect(wrapper.text()).toContain("Zur Anmeldung");
    expect(toastAddMock).not.toHaveBeenCalled();
    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it("does not call the API when the link parameters are missing", async () => {
    query = { em: "em-hash" };

    const wrapper = await mountPage();

    expect(invokeMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Bestätigung fehlgeschlagen");
    expect(navigateToMock).not.toHaveBeenCalled();
  });
});
