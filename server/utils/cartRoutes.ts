import type { H3Event } from "h3";
import {
  dishConfiguration,
  DomainError,
  type Cart,
  type DishConfiguration,
} from "../../shared/domain";
import type { BackendSession, CartPort } from "../ports";

/**
 * The cart behind the BFF (ADR 0001, step 4): `/api/cart` and its write
 * routes answer the domain `Cart`, privately (never stored by a browser or
 * proxy). Reads never create a session; writes come from the storefront's
 * own pages only (CSRF) and run one after the other per visitor; a write
 * that still carries the cookie from before a parallel request replaced
 * the session answers 409 `stale_session` (the browser retries with the
 * new cookie).
 */
export async function answerCart(
  event: H3Event,
  access: "read" | "write",
  run: (cart: CartPort, session: BackendSession) => Promise<Cart>,
): Promise<Cart> {
  if (access === "write") assertSameOriginWrite(event);
  answerPrivately(event);
  const backend = useBackend(event);
  return answerDomain(async () => {
    const session = await backendSession(event, backend.name, {
      create: access === "write",
    });
    if (access === "read") return run(backend.cart, session);
    const visitor = useVisitorSession(event);
    return visitor.exclusive(async () => {
      // the cookie is older than a state a parallel request sealed: acting
      // on it would write to a replaced token (a throwaway cart)
      if (await visitor.isStale()) {
        throw new DomainError(
          "stale_session",
          "The request carried an outdated session.",
        );
      }
      return run(backend.cart, session);
    });
  });
}

/** The backends' opaque ids; case is kept (line ids are the backend's). */
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
/** ShopBite plugin: at most 30 children, 20 removed ingredients. */
const MAX_EXTRAS = 29;
const MAX_REMOVED = 20;
const MAX_VOUCHER = 100;

const invalid = (field: string, value?: unknown): never => {
  throw new DomainError("invalid_value", `Invalid ${field}.`, { field, value });
};

function id(value: unknown, field: string): string {
  if (typeof value !== "string" || !ID.test(value)) invalid(field);
  return value as string;
}

function ids(value: unknown, field: string, max: number): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) invalid(field);
  return (value as unknown[]).map((entry) => id(entry, field));
}

/**
 * The body of `POST /api/cart/lines`: `{ dishId, variantId?, extraIds?,
 * removedIngredientIds?, quantity }`.
 */
export function cartLineBody(body: unknown): {
  configuration: DishConfiguration;
  quantity: number;
} {
  if (!body || typeof body !== "object") invalid("body");
  const input = body as Record<string, unknown>;
  const quantity = input.quantity;
  if (typeof quantity !== "number") invalid("quantity", quantity);
  return {
    configuration: dishConfiguration({
      dishId: id(input.dishId, "dishId"),
      variantId:
        input.variantId === undefined || input.variantId === null
          ? null
          : id(input.variantId, "variantId"),
      extraIds: ids(input.extraIds, "extraIds", MAX_EXTRAS),
      removedIngredientIds: ids(
        input.removedIngredientIds,
        "removedIngredientIds",
        MAX_REMOVED,
      ),
    }),
    quantity: quantity as number,
  };
}

/** `PATCH /api/cart/lines/[lineId]`: `{ quantity }`. */
export function quantityBody(body: unknown): number {
  const quantity = (body as { quantity?: unknown } | null)?.quantity;
  if (typeof quantity !== "number") invalid("quantity", quantity);
  return quantity as number;
}

export function lineIdParam(event: H3Event): string {
  return id(getRouterParam(event, "lineId"), "lineId");
}

export function voucherCode(value: unknown): string {
  const code = typeof value === "string" ? value.trim() : "";
  if (!code || code.length > MAX_VOUCHER) invalid("code");
  return code;
}
