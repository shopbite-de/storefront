import { createShopwareBackend } from "../../server/adapters/shopware";
import {
  fakeShopwareProducts,
  httpError,
  type FakeStoreApiExtension,
  type Json,
} from "./cartFixtures";
import type { CustomerScenario } from "./customer.contract";
import { fakeShopwareAccounts, memoryCustomer } from "./customerFixtures";
import { GERMANY } from "./orderingFixtures";
import type { WishlistFixture } from "./wishlist.contract";

/** The memory adapter: the customer fixture's backend. */
export const memoryWishlist: WishlistFixture = {
  adapter: "memory",
  create: (scenario) => ({ backend: memoryCustomer.create(scenario).backend }),
};

/** One entry of the ShopBite plugin's `shopbite_wishlist_item`. */
export type FakeWishlistItem = {
  id: string;
  customerId: string;
  productId: string;
  productNumber: string;
  without: string[];
  extras: string[];
  createdAt: string;
};

/** Trimmed, without empty values, unique and sorted (`WishlistConfiguration`). */
const normalised = (values: unknown): string[] => {
  if (values === undefined || values === null) return [];
  if (
    !Array.isArray(values) ||
    values.some((value) => typeof value !== "string")
  ) {
    throw httpError(400, "SHOPBITE__WISHLIST_INVALID_CONFIGURATION");
  }
  return [
    ...new Set(
      (values as string[]).map((value) => value.trim()).filter(Boolean),
    ),
  ].sort();
};

/**
 * The ShopBite plugin's wishlist routes (`WishlistRoute`, checked against
 * the quickstart) and Shopware's own wishlist of plain products: login
 * required (403 for a visitor or a checkout guest), entries per customer
 * newest first, an add of an equal configuration answers the stored one,
 * an unknown product is 400, another customer's entry 404, a merge takes
 * at most 100 items and leaves out unknown products and equal ones.
 */
export function fakeShopwareWishlist(scenario: CustomerScenario) {
  const products = fakeShopwareProducts(scenario.cart);
  const items: FakeWishlistItem[] = [];
  /** Shopware's own wishlist (product ids) per customer id. */
  const core = new Map<string, string[]>();
  let clock = Date.parse("2026-11-22T12:00:00Z");
  let ids = 0;
  const holder: { fake?: ReturnType<typeof fakeShopwareAccounts> } = {};

  const json = (item: FakeWishlistItem) => ({
    id: item.id,
    productId: item.productId,
    productNumber: item.productNumber,
    without: item.without,
    extras: item.extras,
    createdAt: item.createdAt,
    apiAlias: "shopbite_wishlist_entry",
  });
  const listOf = (customerId: string) =>
    items
      .filter((item) => item.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const match = (
    customerId: string,
    productId: string,
    without: string[],
    extras: string[],
  ) =>
    items.find(
      (item) =>
        item.customerId === customerId &&
        item.productId === productId &&
        item.without.join("\n") === without.join("\n") &&
        item.extras.join("\n") === extras.join("\n"),
    );
  const create = (
    customerId: string,
    productId: string,
    without: string[],
    extras: string[],
    at: number,
  ) => {
    const item: FakeWishlistItem = {
      id: `wish${String(++ids).padStart(28, "0")}`,
      customerId,
      productId,
      productNumber: products.get(productId)!.productNumber,
      without,
      extras,
      createdAt: new Date(at).toISOString(),
    };
    items.push(item);
    return item;
  };

  const extension: FakeStoreApiExtension = {
    visitor: ({ method, path, body }, { token }) => {
      const wishlist = path.startsWith("/shopbite/wishlist");
      const coreWishlist = path.startsWith("/customer/wishlist");
      if (!wishlist && !coreWishlist) return undefined;
      const account = holder.fake!.accountOf(token);
      if (!account) {
        throw httpError(403, "CHECKOUT__CUSTOMER_NOT_LOGGED_IN");
      }
      const input = (body ?? {}) as Json;
      if (method === "POST" && path === "/shopbite/wishlist") {
        return { data: { elements: listOf(account.id).map(json) } };
      }
      if (method === "POST" && path === "/shopbite/wishlist/add") {
        const productId = input.productId as string;
        if (!products.has(productId)) {
          throw httpError(400, "SHOPBITE__WISHLIST_PRODUCT_NOT_FOUND");
        }
        const without = normalised(input.without);
        const extras = normalised(input.extras);
        const found =
          match(account.id, productId, without, extras) ??
          create(account.id, productId, without, extras, (clock += 1000));
        return { data: json(found) };
      }
      if (method === "POST" && path === "/shopbite/wishlist/merge") {
        const at = (clock += 1000);
        let offset = 0;
        for (const item of ((input.items as Json[]) ?? []).slice(0, 100)) {
          const productId = item.productId as string;
          if (!products.has(productId)) continue;
          const without = normalised(item.without);
          const extras = normalised(item.extras);
          if (match(account.id, productId, without, extras)) continue;
          create(account.id, productId, without, extras, at - offset++);
        }
        return { data: { elements: listOf(account.id).map(json) } };
      }
      const single = path.match(/^\/shopbite\/wishlist\/([^/]+)$/);
      if (method === "DELETE" && single) {
        const index = items.findIndex(
          (item) => item.id === single[1] && item.customerId === account.id,
        );
        if (index < 0)
          throw httpError(404, "SHOPBITE__WISHLIST_ITEM_NOT_FOUND");
        items.splice(index, 1);
        return { data: null };
      }
      if (method === "POST" && path === "/customer/wishlist") {
        const productIds = core.get(account.id) ?? [];
        if (!productIds.length) {
          throw httpError(404, "CHECKOUT__WISHLIST_NOT_FOUND");
        }
        return {
          data: {
            products: { elements: productIds.map((id) => ({ id })) },
          },
        };
      }
      const coreDelete = path.match(/^\/customer\/wishlist\/delete\/([^/]+)$/);
      if (method === "DELETE" && coreDelete) {
        core.set(
          account.id,
          (core.get(account.id) ?? []).filter((id) => id !== coreDelete[1]),
        );
        return { data: { success: true } };
      }
      throw new Error(`unexpected ${method} ${path}`);
    },
  };

  holder.fake = fakeShopwareAccounts(scenario, extension);
  return { ...holder.fake, items, core };
}

export const shopwareWishlist: WishlistFixture = {
  adapter: "shopware",
  create: (scenario) => {
    const fake = fakeShopwareWishlist(scenario);
    return {
      backend: createShopwareBackend({
        storeApi: fake.storeApi,
        visitorApi: fake.visitorApi,
        countryId: GERMANY,
        storeUrl: "https://shop.example.com",
        timeZone: "Europe/Berlin",
        log: () => {},
      }),
    };
  },
};
