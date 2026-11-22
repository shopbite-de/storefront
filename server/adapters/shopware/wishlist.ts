import {
  deepFreeze,
  dishConfiguration,
  DomainError,
  isDomainError,
  type DishConfiguration,
  type DomainErrorCode,
  type Id,
  type WishlistEntry,
} from "../../../shared/domain";
import type { BackendSession, WishlistPort } from "../../ports";
import { WISHLIST_MERGE_LIMIT } from "../../ports/WishlistPort";
import { keptFor, LOOKUP_CRITERIA, LOOKUP_HEADERS } from "./cart";
import { toIngredients, type SwProduct } from "./catalog";
import { causeOf, fail, type ShopwareVisitorTools } from "./ordering";
import { errorCodes, statusOf } from "./request";
import type { AdapterLog } from "./shop";

/*
 * The customer's wishlist over the ShopBite plugin's `/shopbite/wishlist`
 * (ADR 0001, step 7) with the visitor's context token. The plugin keeps an
 * entry by the ordered product (the variant, else the dish), the removed
 * main ingredients by name and the extras by product number, each list
 * sorted, exactly as the 2.x storefront wrote them; the adapter translates
 * to and from the domain's ids with one product lookup (the products of
 * the entries, inheriting their dish's ingredients) and the extras each
 * dish offers (its `productList` cross-sellings), both kept a while. A
 * customer's Shopware wishlist of plain products (before the plugin's
 * wishlist) moves into the plugin on a read and is emptied there.
 */

/** One entry as the plugin answers it (`shopbite_wishlist_entry`). */
type SwWishlistEntry = {
  id: string;
  productId: string;
  productNumber?: string | null;
  without?: unknown;
  extras?: unknown;
  createdAt?: string | null;
};

type Looked = Readonly<{
  id: Id;
  parentId: Id | null;
  number: string;
  /** Main ingredients (a variant inherits its dish's). */
  ingredients: readonly Readonly<{ id: Id; name: string }>[];
}>;

/** The extras a dish offers: product number ↔ id. */
type Extras = Readonly<{
  byId: ReadonlyMap<Id, string>;
  byNumber: ReadonlyMap<string, Id>;
}>;

const EXTRAS_CRITERIA = {
  includes: {
    cross_selling_element: ["products"],
    product: ["id", "productNumber"],
  },
};

/** Shopware ids: 32 hex digits (the domain's ids are opaque). */
const SHOPWARE_ID = /^[0-9a-f]{32}$/i;
/** Ids per product lookup (the Store API's limit). */
const LOOKUP_LIMIT = 100;
/** How long an empty or switched-off Shopware wishlist is not asked again. */
const CORE_TTL_MS = 600_000;

/** Shopware's own wishlist: the product ids only. */
const CORE_CRITERIA = { limit: 100, includes: { product: ["id"] } };

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

/** Trimmed, unique and sorted, as the plugin stores both lists. */
const pluginList = (values: readonly string[]) =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();

const unauthenticated = () =>
  fail("unauthenticated", "The wishlist needs a logged-in customer.");

const invalid = (message: string, value: unknown) =>
  new DomainError("invalid_value", message, { value });

const unavailable = (dishId: Id) =>
  new DomainError("dish_unavailable", "The menu does not offer this dish.", {
    dishId,
  });

/**
 * A refusal of the plugin's routes: 401/403 `unauthenticated`, an unknown
 * entry `not_found`, an unknown product `dish_unavailable`, a route the
 * plugin does not have (older than its wishlist) `not_implemented`.
 */
function refusal(what: string, error: unknown): DomainError {
  if (isDomainError(error)) return error;
  const status = statusOf(error);
  const codes = errorCodes(error);
  const code: DomainErrorCode = codes.includes(
    "SHOPBITE__WISHLIST_ITEM_NOT_FOUND",
  )
    ? "not_found"
    : codes.includes("SHOPBITE__WISHLIST_PRODUCT_NOT_FOUND")
      ? "dish_unavailable"
      : status === 401 || status === 403
        ? "unauthenticated"
        : status === 404
          ? "not_implemented"
          : status === 400
            ? "invalid_value"
            : "backend_unavailable";
  return new DomainError(
    code,
    code === "backend_unavailable"
      ? `Shopware did not answer for ${what}.`
      : `Shopware refused ${what}.`,
    {},
    { cause: causeOf(error) },
  );
}

export function createShopwareWishlist(
  tools: ShopwareVisitorTools,
  options: { log?: AdapterLog; lookupTtlMs?: number } = {},
): WishlistPort {
  const { send, shop } = tools;
  const log = options.log ?? (() => {});
  const products = keptFor<Looked>(options.lookupTtlMs);
  const extrasOf = keptFor<Extras>(options.lookupTtlMs);
  const unknown = keptFor<true>(options.lookupTtlMs);
  /** Customers (by token) whose Shopware wishlist is empty or switched off. */
  const noCoreWishlist = keptFor<true>(CORE_TTL_MS);
  /** A move of Shopware's wishlist in flight, per token (two reads, one move). */
  const moving = new Map<string, Promise<SwWishlistEntry[] | undefined>>();

  async function ask<T>(what: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw refusal(what, error);
    }
  }

  /** The plugin's routes need a logged-in customer: none without a token. */
  async function loggedIn(session: BackendSession): Promise<void> {
    if (!(await session.read())) throw unauthenticated();
  }

  /**
   * Number, dish and main ingredients of products, kept a while; ids
   * Shopware does not know (or that are no Shopware ids) are remembered as
   * unknown for as long, so a guest's list of dishes off the menu costs one
   * lookup. At most 100 ids per request (the Store API's limit).
   */
  async function lookUp(ids: readonly Id[]): Promise<Map<Id, Looked>> {
    const result = new Map<Id, Looked>();
    const wanted = [...new Set(ids)];
    for (const id of wanted) {
      const kept = products.get(id);
      if (kept) result.set(id, kept);
    }
    const missing = wanted.filter(
      (id) => !result.has(id) && !unknown.get(id) && SHOPWARE_ID.test(id),
    );
    const chunks: Id[][] = [];
    for (let at = 0; at < missing.length; at += LOOKUP_LIMIT) {
      chunks.push(missing.slice(at, at + LOOKUP_LIMIT));
    }
    const answers = await Promise.all(
      chunks.map((chunk) =>
        ask("the products", () =>
          shop.post<{ elements?: SwProduct[] }>(
            "/product",
            { ids: chunk, limit: chunk.length, ...LOOKUP_CRITERIA },
            LOOKUP_HEADERS,
          ),
        ),
      ),
    );
    for (const product of answers.flatMap((answer) => answer.elements ?? [])) {
      const looked: Looked = {
        id: product.id,
        parentId: product.parentId ?? null,
        number: product.productNumber,
        ingredients: toIngredients(product),
      };
      products.set(product.id, looked);
      result.set(product.id, looked);
    }
    for (const id of missing) if (!result.has(id)) unknown.set(id, true);
    return result;
  }

  /** The extras a dish offers, by number and id, kept a while. */
  async function extras(dishId: Id): Promise<Extras> {
    const kept = extrasOf.get(dishId);
    if (kept) return kept;
    const groups = await ask("the extras", () =>
      shop.post<{ products?: { id: string; productNumber?: string }[] }[]>(
        `/product/${dishId}/cross-selling`,
        EXTRAS_CRITERIA,
      ),
    );
    const byId = new Map<Id, string>();
    const byNumber = new Map<string, Id>();
    for (const product of (groups ?? []).flatMap(
      (group) => group.products ?? [],
    )) {
      if (!product.productNumber) continue;
      byId.set(product.id, product.productNumber);
      byNumber.set(product.productNumber, product.id);
    }
    const found: Extras = { byId, byNumber };
    extrasOf.set(dishId, found);
    return found;
  }

  /** The products and the dishes' extras the configurations name. */
  async function lookUpConfigurations(
    configurations: readonly DishConfiguration[],
  ) {
    const looked = await lookUp(
      configurations.flatMap((configuration) =>
        configuration.variantId
          ? [configuration.dishId, configuration.variantId]
          : [configuration.dishId],
      ),
    );
    const dishes = [
      ...new Set(
        configurations
          .filter(
            (configuration) =>
              configuration.extraIds.length && looked.has(configuration.dishId),
          )
          .map((configuration) => configuration.dishId),
      ),
    ];
    const offered = new Map(
      await Promise.all(
        dishes.map(async (id) => [id, await extras(id)] as const),
      ),
    );
    return { looked, offered };
  }

  /**
   * A configuration as the plugin keeps it; refuses what the menu does not
   * offer (an unknown dish, a variant of another dish, an extra the dish
   * does not offer, a removal it does not have).
   */
  function toPlugin(
    configuration: DishConfiguration,
    { looked, offered }: Awaited<ReturnType<typeof lookUpConfigurations>>,
  ) {
    const ordered = configuration.variantId ?? configuration.dishId;
    const dish = looked.get(configuration.dishId);
    const product = looked.get(ordered);
    if (!dish || dish.parentId) throw unavailable(configuration.dishId);
    if (!product) throw unavailable(ordered);
    if (configuration.variantId && product.parentId !== dish.id) {
      throw invalid("The variant belongs to another dish.", configuration);
    }
    const without = configuration.removedIngredientIds.map((id) => {
      const ingredient = product.ingredients.find((entry) => entry.id === id);
      if (!ingredient) throw invalid("The dish has no such ingredient.", id);
      return ingredient.name;
    });
    const extraNumbers = configuration.extraIds.map((id) => {
      const number = offered.get(dish.id)?.byId.get(id);
      if (!number) throw invalid("The dish has no such extra.", id);
      return number;
    });
    return {
      productId: ordered,
      without: pluginList(without),
      extras: pluginList(extraNumbers),
    };
  }

  /**
   * The plugin's entries as domain entries. A product the menu no longer
   * has stays an entry of its own id (the storefront cannot show it);
   * names and numbers the dish no longer has are left out.
   */
  async function toEntries(
    entries: readonly SwWishlistEntry[],
  ): Promise<readonly WishlistEntry[]> {
    const looked = await lookUp(entries.map((entry) => entry.productId));
    const dishesWithExtras = [
      ...new Set(
        entries.flatMap((entry) => {
          const product = looked.get(entry.productId);
          return product && strings(entry.extras).length
            ? [product.parentId ?? product.id]
            : [];
        }),
      ),
    ];
    const offered = new Map(
      await Promise.all(
        dishesWithExtras.map(async (id) => [id, await extras(id)] as const),
      ),
    );
    return deepFreeze(
      entries.map((entry): WishlistEntry => {
        const product = looked.get(entry.productId);
        const dishId = product?.parentId ?? entry.productId;
        const removed = strings(entry.without).flatMap((name) => {
          const ingredient = product?.ingredients.find(
            (candidate) => candidate.name === name,
          );
          return ingredient ? [ingredient.id] : [];
        });
        const extraIds = strings(entry.extras).flatMap((number) => {
          const id = offered.get(dishId)?.byNumber.get(number);
          return id ? [id] : [];
        });
        return {
          id: entry.id,
          configuration: dishConfiguration({
            dishId,
            variantId: product?.parentId ? product.id : null,
            extraIds,
            removedIngredientIds: removed,
          }),
          dishNumber: product?.number ?? entry.productNumber ?? "",
          addedAt: entry.createdAt ?? new Date(0).toISOString(),
        };
      }),
    );
  }

  const list = (session: BackendSession) =>
    ask("the wishlist", () =>
      send<{ elements?: SwWishlistEntry[] }>(
        session,
        "POST",
        "/shopbite/wishlist",
        {},
      ),
    );

  /**
   * Shopware's own wishlist of the customer (plain products, kept before
   * the plugin's wishlist) moves into the plugin; answers the plugin's list
   * after the move, or undefined when there was nothing to move. An empty
   * or switched-off one is not asked again for 10 minutes; two reads at once
   * share one move (the BFF also runs it in the visitor's exclusive section).
   */
  async function moveCoreWishlist(
    session: BackendSession,
  ): Promise<SwWishlistEntry[] | undefined> {
    const token = (await session.read())!;
    if (noCoreWishlist.get(token)) return undefined;
    const running = moving.get(token);
    if (running) return running;
    const move = (async () => {
      let productIds: string[];
      try {
        const answer = await send<{
          products?: { elements?: { id: string }[] };
        }>(session, "POST", "/customer/wishlist", CORE_CRITERIA);
        productIds = (answer.products?.elements ?? []).map(
          (product) => product.id,
        );
      } catch (error) {
        // none (404) or switched off in the shop (403); else ask next time
        const status = statusOf(error);
        if (status === 404 || status === 403) noCoreWishlist.set(token, true);
        return undefined;
      }
      if (!productIds.length) {
        noCoreWishlist.set(token, true);
        return undefined;
      }
      try {
        const merged = await send<{ elements?: SwWishlistEntry[] }>(
          session,
          "POST",
          "/shopbite/wishlist/merge",
          { items: productIds.map((productId) => ({ productId })) },
        );
        await Promise.all(
          productIds.map((productId) =>
            send(session, "DELETE", `/customer/wishlist/delete/${productId}`),
          ),
        );
        noCoreWishlist.set(token, true);
        return merged.elements ?? [];
      } catch (error) {
        log("[shopware][wishlist] moving the Shopware wishlist failed", {
          status: statusOf(error),
          codes: errorCodes(error),
        });
        return undefined;
      }
    })();
    moving.set(token, move);
    try {
      return await move;
    } finally {
      moving.delete(token);
    }
  }

  return {
    listEntries: async (session) => {
      await loggedIn(session);
      // the move answers the whole list; else the list is asked
      const moved = await moveCoreWishlist(session);
      return toEntries(moved ?? (await list(session)).elements ?? []);
    },

    addEntry: async (session, configuration) => {
      await loggedIn(session);
      const body = toPlugin(
        configuration,
        await lookUpConfigurations([configuration]),
      );
      const entry = await ask("the wishlist entry", () =>
        send<SwWishlistEntry>(session, "POST", "/shopbite/wishlist/add", body),
      );
      return (await toEntries([entry]))[0]!;
    },

    removeEntry: async (session, entryId) => {
      await loggedIn(session);
      await ask("the wishlist entry", () =>
        send(
          session,
          "DELETE",
          `/shopbite/wishlist/${encodeURIComponent(entryId)}`,
        ),
      );
    },

    merge: async (session, configurations) => {
      await loggedIn(session);
      const wanted = configurations.slice(0, WISHLIST_MERGE_LIMIT);
      // one lookup for all products, the extras of each dish at once
      const known = await lookUpConfigurations(wanted);
      const items: ReturnType<typeof toPlugin>[] = [];
      for (const configuration of wanted) {
        try {
          items.push(toPlugin(configuration, known));
        } catch (error) {
          // what the menu no longer offers is left out, like the plugin does
          if (
            isDomainError(error, "invalid_value") ||
            isDomainError(error, "dish_unavailable")
          ) {
            continue;
          }
          throw error;
        }
      }
      if (!items.length) return toEntries((await list(session)).elements ?? []);
      const answer = await ask("the wishlist", () =>
        send<{ elements?: SwWishlistEntry[] }>(
          session,
          "POST",
          "/shopbite/wishlist/merge",
          { items },
        ),
      );
      return toEntries(answer.elements ?? []);
    },
  };
}
