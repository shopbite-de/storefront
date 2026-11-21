import type { Customer, GuestDetails } from "../../shared/domain";

export type RegistrationAnswer = {
  customer: Customer;
  /** Double opt-in: the e-mail is to be confirmed before the login. */
  confirmationRequired: boolean;
};

/** A write of the account through the browser's one write queue. */
const write = <T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
) =>
  queuedWrite(() =>
    withStaleRetry(() =>
      $fetch<T>(path, {
        method,
        ...(body === undefined
          ? {}
          : { body: body as Record<string, unknown> }),
      }),
    ),
  );

/**
 * The session's customer (ADR 0001, step 6): the logged-in customer, the
 * guest of the session or null, from `GET /api/account` (the server
 * renders it, so the header knows the login on the first paint). Login,
 * logout, registration and its confirmation go through the BFF, which
 * reseals the session; the app reloads the cart, the checkout's methods
 * and the wishlist when `isLoggedIn` changes (app.vue). Passwords only
 * travel in the request bodies of these writes.
 */
export function useCustomer() {
  const customer = useState<Customer | null | undefined>(
    "customer",
    () => undefined,
  );
  // the account's addresses and orders of the customer before (another
  // login, a logout, a deletion in the same tab) are never shown again
  const addresses = useState<unknown>("account-addresses", () => null);
  const orders = useState<unknown>("account-orders", () => null);
  const switchTo = (next: Customer | null) => {
    if (next?.id !== customer.value?.id) {
      addresses.value = null;
      orders.value = null;
    }
    customer.value = next;
  };
  // during server-side rendering the request's cookie goes along
  const fetcher = import.meta.server ? useRequestFetch() : $fetch;

  async function refresh(): Promise<Customer | null> {
    const answer = await fetcher<{ customer: Customer | null }>("/api/account");
    switchTo(answer.customer);
    return answer.customer;
  }

  async function login(email: string, password: string): Promise<Customer> {
    const next = await write<Customer>("/api/account/login", "POST", {
      email,
      password,
    });
    switchTo(next);
    return next;
  }

  async function logout(): Promise<void> {
    await write("/api/account/logout", "POST");
    switchTo(null);
    // also when the customer was never loaded in this tab
    addresses.value = null;
    orders.value = null;
  }

  async function register(
    details: GuestDetails & { password: string },
  ): Promise<RegistrationAnswer> {
    const answer = await write<RegistrationAnswer>(
      "/api/account/register",
      "POST",
      details,
    );
    if (!answer.confirmationRequired) switchTo(answer.customer);
    return answer;
  }

  async function confirmRegistration(
    parameters: Record<string, string>,
  ): Promise<Customer> {
    const next = await write<Customer>(
      "/api/account/register/confirm",
      "POST",
      parameters,
    );
    switchTo(next);
    return next;
  }

  async function updateProfile(change: {
    firstName: string;
    lastName: string;
  }): Promise<Customer> {
    const next = await write<Customer>("/api/account/profile", "PATCH", change);
    switchTo(next);
    return next;
  }

  async function changeEmail(email: string, password: string) {
    const next = await write<Customer>("/api/account/email", "POST", {
      email,
      password,
    });
    switchTo(next);
    return next;
  }

  /** `loggedIn: false`: changed, the customer logs in again with it. */
  const changePassword = (currentPassword: string, newPassword: string) =>
    write<{ loggedIn: boolean }>("/api/account/password", "POST", {
      currentPassword,
      newPassword,
    });

  const requestPasswordReset = (email: string) =>
    write<null>("/api/account/password-reset", "POST", { email });

  const resetPassword = (token: string, newPassword: string) =>
    write<null>("/api/account/password-reset/confirm", "POST", {
      token,
      newPassword,
    });

  async function deleteAccount(): Promise<void> {
    await write("/api/account", "DELETE");
    switchTo(null);
  }

  return {
    customer: computed(() => customer.value ?? null),
    /** Loaded: null is a visitor, undefined not asked yet. */
    loaded: computed(() => customer.value !== undefined),
    isLoggedIn: computed(() => !!customer.value && !customer.value.guest),
    isGuest: computed(() => customer.value?.guest === true),
    refresh,
    login,
    logout,
    register,
    confirmRegistration,
    updateProfile,
    changeEmail,
    changePassword,
    requestPasswordReset,
    resetPassword,
    deleteAccount,
  };
}
