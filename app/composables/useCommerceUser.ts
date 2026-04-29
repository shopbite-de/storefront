import type { SessionContext, Customer } from "~/types/commerce/user";

const SESSION_STATE_KEY = "commerce:session";

/**
 * Platform-agnostic user/auth composable backed by /api/auth/*.
 * Replaces useUser() from @shopware/composables once all consumers are migrated.
 *
 * Session state is shared via useState so it is SSR-safe and reactive
 * across all components without re-fetching.
 */
export function useCommerceUser() {
  const session = useState<SessionContext>(SESSION_STATE_KEY, () => ({
    isLoggedIn: false,
    isGuestSession: false,
    user: null,
    selectedPaymentMethodId: null,
    selectedShippingMethodId: null,
    navigationCategoryId: null,
    currencyIsoCode: "EUR",
  }));

  const user = computed<Customer | null>(() => session.value.user);
  const isLoggedIn = computed(() => session.value.isLoggedIn);
  const isGuestSession = computed(() => session.value.isGuestSession);

  const userDefaultShippingAddress = computed(
    () => session.value.user?.defaultShippingAddress ?? null,
  );
  const userDefaultBillingAddress = computed(
    () => session.value.user?.defaultBillingAddress ?? null,
  );

  async function refreshUser(options?: {
    associations?: Record<string, unknown>;
  }) {
    // GET /api/auth/context calls GET /context on Shopware, which includes
    // the customer object with any associations that were set server-side.
    // For now association filtering is ignored — Shopware's context always
    // includes the default addresses when the customer is loaded.
    void options; // reserved for future per-platform association support
    session.value = await $fetch<SessionContext>("/api/auth/context");
  }

  async function login(credentials: {
    username: string;
    password: string;
  }): Promise<void> {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: credentials,
    });
    await refreshUser();
  }

  async function logout(): Promise<void> {
    await $fetch("/api/auth/logout", { method: "POST" });
    session.value = {
      isLoggedIn: false,
      isGuestSession: false,
      user: null,
      selectedPaymentMethodId: null,
      selectedShippingMethodId: null,
      navigationCategoryId: null,
      currencyIsoCode: "EUR",
    };
  }

  async function register(data: Record<string, unknown>): Promise<void> {
    await $fetch("/api/auth/register", { method: "POST", body: data });
    await refreshUser();
  }

  async function updatePersonalInfo(data: {
    firstName: string;
    lastName: string;
  }): Promise<void> {
    await $fetch("/api/auth/me", { method: "PATCH", body: data });
    await refreshUser();
  }

  async function updateEmail(data: {
    email: string;
    emailConfirmation: string;
    password: string;
  }): Promise<void> {
    await $fetch("/api/auth/me/email", { method: "PATCH", body: data });
    await refreshUser();
  }

  async function deleteAccount(): Promise<void> {
    await $fetch("/api/auth/me", { method: "DELETE" });
  }

  return {
    session,
    user,
    isLoggedIn,
    isGuestSession,
    userDefaultShippingAddress,
    userDefaultBillingAddress,
    refreshUser,
    login,
    logout,
    register,
    updatePersonalInfo,
    updateEmail,
    deleteAccount,
  };
}
