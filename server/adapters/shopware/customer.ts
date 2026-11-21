import {
  deepFreeze,
  DomainError,
  isDomainError,
  type Address,
  type Country,
  type Customer,
  type DomainErrorCode,
} from "../../../shared/domain";
import type { BackendSession, CustomerPort } from "../../ports";
import {
  ADDRESS_ASSOCIATIONS,
  causeOf,
  CUSTOMER_CRITERIA,
  fail,
  refusedFields,
  type ShopwareVisitorTools,
  type SwAddress,
  type SwCustomer,
} from "./ordering";
import { errorCodes, statusOf } from "./request";
import { text } from "./shop";

/*
 * The customer's account over the Store API with the visitor's context
 * token (ADR 0001, step 6). Login, logout, registration, its confirmation,
 * the password change and the deletion make Shopware issue a new token,
 * which `send` writes into the session: the old token no longer opens the
 * account. Shopware merges the visitor's cart into the customer's on login
 * (`/account/login` with the visitor's token). Shopware's per-IP limits
 * see the visitor through `X-Forwarded-For` (login: the visitor's request;
 * password reset: the shop request with the header). Passwords are sent
 * only in request bodies and never logged: a refusal's cause carries
 * status and error codes only (`causeOf`).
 */

/** Shopware's error codes as domain codes, checked before the status. */
const ACCOUNT_REFUSALS: Readonly<Record<string, DomainErrorCode>> = {
  CHECKOUT__CUSTOMER_AUTH_BAD_CREDENTIALS: "invalid_credentials",
  "VIOLATION::CUSTOMER_PASSWORD_NOT_CORRECT": "invalid_credentials",
  CHECKOUT__CUSTOMER_OPTIN_NOT_COMPLETED: "account_not_confirmed",
  CHECKOUT__CUSTOMER_IS_INACTIVE: "account_not_confirmed",
  "VIOLATION::CUSTOMER_EMAIL_NOT_UNIQUE": "email_taken",
  CHECKOUT__CUSTOMER_IS_ALREADY_CONFIRMED: "already_confirmed",
  CHECKOUT__CUSTOMER_NOT_FOUND_BY_HASH: "not_found",
  CHECKOUT__CUSTOMER_RECOVERY_HASH_EXPIRED: "not_found",
  CHECKOUT__CUSTOMER_NOT_FOUND_BY_EMAIL: "not_found",
  CHECKOUT__CUSTOMER_ADDRESS_NOT_FOUND: "not_found",
  CHECKOUT__CUSTOMER_ADDRESS_IS_DEFAULT: "address_in_use",
  CHECKOUT__CUSTOMER_AUTH_THROTTLED: "rate_limited",
  FRAMEWORK__RATE_LIMIT_EXCEEDED: "rate_limited",
};

/** How long Shopware's rate limit holds, from its error answer. */
const retryAfter = (error: unknown): number | undefined => {
  const seconds = (
    error as {
      data?: { errors?: { meta?: { parameters?: { seconds?: unknown } } }[] };
    } | null
  )?.data?.errors?.find((entry) => entry.meta?.parameters?.seconds)?.meta
    ?.parameters?.seconds;
  const value = Number(seconds);
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : undefined;
};

/**
 * A refusal of the account routes as a domain error: Shopware's codes
 * first, then 401/403 `unauthenticated`, 429 `rate_limited`, 400 with
 * fields `validation_failed`, 404 `not_found`, else `backend_unavailable`.
 */
function refusal(what: string, error: unknown): DomainError {
  if (isDomainError(error)) return error;
  const status = statusOf(error);
  const mapped = errorCodes(error)
    .map((entry) => ACCOUNT_REFUSALS[entry])
    .find(Boolean);
  const code: DomainErrorCode =
    mapped ??
    (status === 401 || status === 403
      ? "unauthenticated"
      : status === 429
        ? "rate_limited"
        : status === 400
          ? "validation_failed"
          : status === 404 || status === 410
            ? "not_found"
            : "backend_unavailable");
  const details: Record<string, unknown> = {};
  if (code === "rate_limited") {
    const seconds = retryAfter(error);
    if (seconds) details.retryAfterSeconds = seconds;
  }
  if (code === "validation_failed") details.fields = refusedFields(error);
  if (code === "email_taken") details.field = "email";
  return new DomainError(
    code,
    code === "backend_unavailable"
      ? `Shopware did not answer for ${what}.`
      : `Shopware refused ${what}.`,
    details,
    { cause: causeOf(error) },
  );
}

const ADDRESS_CRITERIA = { associations: ADDRESS_ASSOCIATIONS };

export function createShopwareCustomer(
  tools: ShopwareVisitorTools,
): CustomerPort {
  const { send, shop } = tools;

  /** A request of the account; its failure as a domain error. */
  async function ask<T>(what: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw refusal(what, error);
    }
  }

  /** Account routes need a logged-in customer: none without a token. */
  async function loggedIn(session: BackendSession): Promise<void> {
    if (!(await session.read())) {
      throw fail("unauthenticated", "The account needs a logged-in customer.");
    }
  }

  /** The session's customer, null for a visitor without one. */
  async function readCustomer(
    session: BackendSession,
  ): Promise<Customer | null> {
    if (!(await session.read())) return null;
    let customer: SwCustomer;
    try {
      customer = await send<SwCustomer>(
        session,
        "POST",
        "/account/customer",
        CUSTOMER_CRITERIA,
      );
    } catch (error) {
      if (statusOf(error) === 401 || statusOf(error) === 403) return null;
      throw refusal("the customer", error);
    }
    const billing = customer.defaultBillingAddress
      ? await tools.toAddress(customer.defaultBillingAddress)
      : null;
    const delivery = customer.defaultShippingAddress
      ? await tools.toAddress(customer.defaultShippingAddress)
      : billing;
    return tools.toCustomer(customer, billing, delivery);
  }

  async function currentCustomer(
    session: BackendSession,
    what: string,
  ): Promise<Customer> {
    const customer = await readCustomer(session);
    if (!customer) {
      throw fail(
        "unauthenticated",
        `Shopware lost the customer after ${what}.`,
      );
    }
    return customer;
  }

  /** Shopware's mails link here: one of the sales channel's domains. */
  const mailUrl = (storefrontUrl: string) =>
    tools.storefrontUrlFor(storefrontUrl);

  /** The shop request for a visitor, with the visitor's address chain. */
  const forVisitor = (session: BackendSession) =>
    session.forwardedFor
      ? { "x-forwarded-for": session.forwardedFor }
      : undefined;

  async function listAddresses(
    session: BackendSession,
  ): Promise<readonly Address[]> {
    await loggedIn(session);
    const answer = await ask("the addresses", () =>
      send<{ elements?: SwAddress[] }>(
        session,
        "POST",
        "/account/list-address",
        ADDRESS_CRITERIA,
      ),
    );
    return deepFreeze(
      await Promise.all((answer.elements ?? []).map(tools.toAddress)),
    );
  }

  return {
    getCustomer: readCustomer,

    login: async (session, email, password) => {
      await ask("the login", () =>
        send(session, "POST", "/account/login", { email, password }),
      );
      return currentCustomer(session, "the login");
    },

    logout: async (session) => {
      if (!(await session.read())) return;
      try {
        await send(session, "POST", "/account/logout", {});
      } catch (error) {
        // a session without a customer is logged out already
        if (statusOf(error) === 401 || statusOf(error) === 403) return;
        throw refusal("the logout", error);
      }
    },

    register: async (session, registration, storefrontUrl) => {
      const [billingAddress, shippingAddress, url] = await Promise.all([
        tools.addressBody({
          ...registration.billingAddress,
          firstName:
            registration.billingAddress.firstName || registration.firstName,
          lastName:
            registration.billingAddress.lastName || registration.lastName,
        }),
        registration.deliveryAddress
          ? tools.addressBody(registration.deliveryAddress)
          : undefined,
        mailUrl(storefrontUrl),
      ]);
      const created = await ask("the registration", () =>
        send<SwCustomer>(session, "POST", "/account/register", {
          accountType: registration.business ? "business" : "private",
          email: registration.email,
          password: registration.password,
          salutationId: "",
          firstName: registration.firstName,
          lastName: registration.lastName,
          guest: false,
          acceptedDataProtection: true,
          storefrontUrl: url,
          billingAddress,
          ...(shippingAddress ? { shippingAddress } : {}),
        }),
      );
      const confirmationRequired =
        created.doubleOptInRegistration === true && created.active !== true;
      if (confirmationRequired) {
        const billing = created.defaultBillingAddress
          ? await tools.toAddress(created.defaultBillingAddress)
          : null;
        return deepFreeze({
          customer: tools.toCustomer(created, billing),
          confirmationRequired,
        });
      }
      return deepFreeze({
        customer: await currentCustomer(session, "the registration"),
        confirmationRequired,
      });
    },

    confirmRegistration: async (session, token) => {
      const em = token.em ?? "";
      const hash = token.hash ?? "";
      if (!em || !hash) throw fail("not_found", "The link is incomplete.");
      await ask("the confirmation", () =>
        send(session, "POST", "/account/register-confirm", { em, hash }),
      );
      return currentCustomer(session, "the confirmation");
    },

    updateProfile: async (session, change) => {
      await loggedIn(session);
      const body: Record<string, unknown> = {
        firstName: change.firstName,
        lastName: change.lastName,
      };
      // the profile form of 2.x sent none: a change without one keeps it
      if (change.salutation) {
        body.salutationId = await tools.salutationId(change.salutation);
      }
      await ask("the profile", () =>
        send(session, "POST", "/account/change-profile", body),
      );
      return currentCustomer(session, "the profile change");
    },

    changeEmail: async (session, email, password) => {
      await loggedIn(session);
      await ask("the e-mail change", () =>
        send(session, "POST", "/account/change-email", {
          email,
          emailConfirmation: email,
          password,
        }),
      );
      return currentCustomer(session, "the e-mail change");
    },

    changePassword: async (session, currentPassword, newPassword) => {
      await loggedIn(session);
      const customer = await readCustomer(session);
      if (!customer || customer.guest) {
        throw fail(
          "unauthenticated",
          "The account needs a logged-in customer.",
        );
      }
      await ask("the password change", () =>
        send(session, "POST", "/account/change-password", {
          password: currentPassword,
          newPassword,
          newPasswordConfirm: newPassword,
        }),
      );
      // Shopware logs every session of the customer out: the one that
      // changed it logs in again (its cart stays with the new token)
      await ask("the login after the password change", () =>
        send(session, "POST", "/account/login", {
          email: customer.email,
          password: newPassword,
        }),
      );
    },

    requestPasswordReset: async (session, email, storefrontUrl) => {
      const url = await mailUrl(storefrontUrl);
      try {
        await shop.post(
          "/account/recovery-password",
          { email, storefrontUrl: url },
          forVisitor(session),
        );
      } catch (error) {
        const failure = refusal("the password reset", error);
        // an e-mail without account is answered like one with
        if (failure.code === "not_found") return;
        throw failure;
      }
    },

    resetPassword: async (session, token, newPassword) => {
      try {
        await shop.post(
          "/account/recovery-password-confirm",
          { hash: token, newPassword, newPasswordConfirm: newPassword },
          forVisitor(session),
        );
      } catch (error) {
        const failure = refusal("the new password", error);
        // a refused token (Shopware validates the hash as a field)
        if (
          failure.code === "validation_failed" &&
          ((failure.details.fields as string[] | undefined) ?? []).includes(
            "hash",
          )
        ) {
          throw fail("not_found", "There is no such password reset.");
        }
        throw failure;
      }
    },

    listAddresses,

    saveAddress: async (session, address) => {
      await loggedIn(session);
      const { id, ...fields } = address;
      const body = await tools.addressBody({
        ...fields,
        country: fields.country ?? null,
      });
      // a change without salutation or country keeps the address's
      if (id && fields.salutation === null) delete body.salutationId;
      if (id && !fields.country) delete body.countryId;
      const saved = await ask("the address", () =>
        id
          ? send<SwAddress>(
              session,
              "PATCH",
              `/account/address/${encodeURIComponent(id)}`,
              { ...body, id },
            )
          : send<SwAddress>(session, "POST", "/account/address", body),
      );
      // the answer lacks the country's code: read the address back
      const listed = (await listAddresses(session)).find(
        (entry) => entry.id === (saved.id ?? id),
      );
      if (!listed) throw fail("not_found", "There is no such address.");
      return listed;
    },

    deleteAddress: async (session, addressId) => {
      await loggedIn(session);
      await ask("the address", () =>
        send(
          session,
          "DELETE",
          `/account/address/${encodeURIComponent(addressId)}`,
        ),
      );
    },

    setDefaultAddress: async (session, addressId, use) => {
      await loggedIn(session);
      const kind = use === "billing" ? "default-billing" : "default-shipping";
      await ask("the default address", () =>
        send(
          session,
          "PATCH",
          `/account/address/${kind}/${encodeURIComponent(addressId)}`,
        ),
      );
      return currentCustomer(session, "the default address");
    },

    deleteAccount: async (session) => {
      await loggedIn(session);
      await ask("the account deletion", () =>
        send(session, "DELETE", "/account/customer"),
      );
    },

    listCountries: async () => {
      const answer = await ask("the countries", () =>
        shop.post<{
          elements?: {
            iso?: string | null;
            name?: string | null;
            translated?: { name?: string | null } | null;
          }[];
        }>("/country", {
          limit: 100,
          includes: { country: ["iso", "name", "translated"] },
        }),
      );
      return deepFreeze(
        (answer.elements ?? []).flatMap((country): Country[] => {
          const code = country.iso?.toUpperCase();
          const name =
            text(country.translated?.name) ?? text(country.name) ?? code;
          return code && name ? [{ code, name }] : [];
        }),
      );
    },
  };
}
