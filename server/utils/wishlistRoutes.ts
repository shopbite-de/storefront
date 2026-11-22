import type { H3Event } from "h3";
import { DomainError, type DishConfiguration } from "../../shared/domain";
import { WISHLIST_MERGE_LIMIT } from "../ports/WishlistPort";
import { configurationBody } from "./cartRoutes";
import { opaqueId } from "./checkoutRoutes";

/*
 * The customer's wishlist behind the BFF (ADR 0001, step 7): routes under
 * `/api/wishlist/**` answer `WishlistEntry` values privately through
 * `answerVisitor` (CSRF, writes one after the other per visitor, 409
 * `stale_session`); 401 `unauthenticated` without a logged-in customer
 * (a guest's wishlist stays in the browser), 501 `not_implemented` when
 * the backend keeps no wishlist (the browser keeps it then).
 */

const invalid = (field: string): never => {
  throw new DomainError("invalid_value", `Invalid ${field}.`, { field });
};

const asObject = (body: unknown): Record<string, unknown> => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    invalid("body");
  }
  return body as Record<string, unknown>;
};

/** `POST /api/wishlist/entries`: a dish configuration. */
export function wishlistEntryBody(body: unknown): DishConfiguration {
  return configurationBody(asObject(body));
}

/**
 * `POST /api/wishlist/merge`: `{ configurations }`, the guest's entries
 * newest first, at most the port's limit.
 */
export function wishlistMergeBody(body: unknown): DishConfiguration[] {
  const configurations = asObject(body).configurations;
  if (
    !Array.isArray(configurations) ||
    configurations.length > WISHLIST_MERGE_LIMIT
  ) {
    invalid("configurations");
  }
  return (configurations as unknown[]).map((entry) =>
    configurationBody(asObject(entry)),
  );
}

export function entryIdParam(event: H3Event): string {
  return opaqueId(getRouterParam(event, "entryId"), "entryId");
}
