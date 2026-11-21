import { createMemoryBackend, demoSeed } from "../../server/adapters/memory";
import {
  createShopwareBackend,
  type StoreApi,
  type VisitorStoreApi,
} from "../../server/adapters/shopware";
import { money } from "../../shared/domain";
import type { CartScenario } from "./cart.contract";
import type { AdapterFixture } from "./harness";

const euro = (amount: number) => money(Math.round(amount * 100), "EUR");

/** The memory adapter with the scenario's dishes and vouchers. */
export const memoryCart: AdapterFixture<CartScenario> = {
  adapter: "memory",
  create: (scenario) => {
    const demo = demoSeed();
    return createMemoryBackend({
      ...demo,
      catalog: {
        ...demo.catalog,
        dishes: scenario.dishes.map((dish) => ({
          id: dish.id,
          number: dish.number,
          name: dish.name,
          description: null,
          price: euro(dish.price),
          listPrice: null,
          sectionIds: [],
          ingredients: dish.ingredients,
          diets: [],
          kitchen: null,
          foodLabels: { allergens: [], additives: [], checked: false },
          available: true,
          media: null,
          path: null,
          topSeller: false,
          upsell: false,
          variantGroups: [
            ...new Set(
              dish.variants.flatMap((variant) =>
                variant.options.map((choice) => choice.group),
              ),
            ),
          ].map((group) => ({
            id: `group:${group}`,
            name: group,
            options: dish.variants.flatMap((variant) =>
              variant.options
                .filter((choice) => choice.group === group)
                .map((choice) => ({
                  id: `option:${choice.option}`,
                  name: choice.option,
                })),
            ),
          })),
          variants: dish.variants.map((variant) => ({
            id: variant.id,
            number: variant.number,
            optionIds: variant.options.map(
              (choice) => `option:${choice.option}`,
            ),
            price: euro(variant.price),
            available: true,
          })),
          extraGroups: dish.extras.length
            ? [
                {
                  id: `extras:${dish.id}`,
                  name: "Extras",
                  extras: dish.extras.map((extra) => ({
                    id: extra.id,
                    number: extra.number,
                    name: extra.name,
                    price: euro(extra.price),
                    available: true,
                  })),
                },
              ]
            : [],
        })),
      },
      cart: {
        vouchers: scenario.vouchers.map((voucher) => ({
          code: voucher.code,
          name: voucher.name,
          amount: euro(voucher.amount),
        })),
      },
    });
  },
};

/* ------------------------------------------------------------------ */
/* Shopware: a fake Store API with the ShopBite plugin's dish lines     */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;
type FakeProduct = {
  id: string;
  parentId: string | null;
  productNumber: string;
  name: string;
  price: number;
  childCount: number;
  options: { group: string; option: string }[];
  ingredients: { id: string; name: string }[];
};
type FakeLine = {
  id: string;
  type: "product" | "container" | "promotion";
  referencedId: string;
  quantity: number;
  label?: string;
  payload: Json;
  children?: { id: string; referencedId: string }[];
  amount?: number;
};

/** What ofetch throws for an HTTP error answer. */
export const httpError = (status: number, code: string) =>
  Object.assign(new Error(`${status} ${code}`), {
    name: "FetchError",
    statusCode: status,
    status,
    data: { errors: [{ status: String(status), code }] },
  });

export function fakeShopwareProducts(scenario: CartScenario) {
  const products = new Map<string, FakeProduct>();
  for (const dish of scenario.dishes) {
    products.set(dish.id, {
      id: dish.id,
      parentId: null,
      productNumber: dish.number,
      name: dish.name,
      price: dish.price,
      childCount: dish.variants.length,
      options: [],
      ingredients: [...dish.ingredients],
    });
    for (const variant of dish.variants) {
      products.set(variant.id, {
        id: variant.id,
        parentId: dish.id,
        productNumber: variant.number,
        // inherited (`sw-inheritance`)
        name: dish.name,
        price: variant.price,
        childCount: 0,
        options: [...variant.options],
        ingredients: [...dish.ingredients],
      });
    }
    for (const extra of dish.extras) {
      products.set(extra.id, {
        id: extra.id,
        parentId: null,
        productNumber: extra.number,
        name: extra.name,
        price: extra.price,
        childCount: 0,
        options: [],
        ingredients: [],
      });
    }
  }
  return products;
}

/** A product as `/product` answers it with the adapter's includes. */
export function productJson(product: FakeProduct): Json {
  return {
    id: product.id,
    parentId: product.parentId,
    productNumber: product.productNumber,
    name: product.name,
    translated: { name: product.name },
    childCount: product.childCount,
    sortedProperties: product.ingredients.length
      ? [
          {
            id: "group-main-ingredients",
            name: "Hauptzutaten",
            translated: { name: "Hauptzutaten" },
            options: product.ingredients.map((ingredient) => ({
              id: ingredient.id,
              name: ingredient.name,
              translated: { name: ingredient.name },
            })),
          },
        ]
      : [],
  };
}

const price = (unit: number, quantity: number) => ({
  unitPrice: unit,
  totalPrice: Math.round(unit * quantity * 100) / 100,
  calculatedTaxes: [],
});

/**
 * The Store API's cart for the scenario, with the plugin's rules for dish
 * lines (label and payload from the products, `without` only of main
 * ingredients, extras once per dish) and Shopware's: an equal id merges,
 * an unknown product is dropped with a `product-not-found` error, a parent
 * with variants is dropped silently, unknown lines are 404, a quantity
 * below 1 is 400, an unknown promotion code is a `promotion-not-found`
 * error.
 */
export function fakeShopwareCart(scenario: CartScenario) {
  const products = fakeShopwareProducts(scenario);
  const carts = new Map<string, FakeLine[]>();
  const requests: {
    method: string;
    path: string;
    body?: Json;
    contextToken?: string;
  }[] = [];
  let tokens = 0;

  function lineJson(line: FakeLine): Json {
    if (line.type === "promotion") {
      return {
        id: line.id,
        type: "promotion",
        referencedId: line.referencedId,
        label: line.label,
        quantity: 1,
        payload: line.payload,
        price: price(line.amount!, 1),
      };
    }
    if (line.type === "product") {
      const product = products.get(line.referencedId)!;
      return {
        id: line.id,
        type: "product",
        referencedId: line.referencedId,
        label: product.name,
        quantity: line.quantity,
        payload: {
          productNumber: product.productNumber,
          parentId: product.parentId,
          options: product.options,
        },
        price: price(product.price, line.quantity),
        cover: null,
      };
    }
    const children = line.children!.map((child) => {
      const product = products.get(child.referencedId)!;
      return {
        id: child.id,
        type: "product",
        referencedId: child.referencedId,
        label: product.name,
        quantity: line.quantity,
        payload: {
          productNumber: product.productNumber,
          parentId: product.parentId,
          options: product.options,
        },
        price: price(product.price, line.quantity),
        cover: null,
      };
    });
    const unit = children.reduce(
      (sum, child) => sum + (child.price.unitPrice as number),
      0,
    );
    return {
      id: line.id,
      type: "container",
      referencedId: line.referencedId,
      label: line.label,
      quantity: line.quantity,
      payload: line.payload,
      price: price(unit, line.quantity),
      children,
    };
  }

  function cartJson(lines: FakeLine[], errors: Json = {}): Json {
    const items = lines.map(lineJson);
    const position =
      Math.round(
        items.reduce(
          (sum, item) =>
            sum + (item.price as { totalPrice: number }).totalPrice,
          0,
        ) * 100,
      ) / 100;
    return {
      token: "the-context-token-must-not-leak",
      lineItems: items,
      price: {
        positionPrice: position,
        totalPrice: position,
        calculatedTaxes: [],
      },
      deliveries: [],
      transactions: [],
      errors,
    };
  }

  function add(lines: FakeLine[], item: Json, errors: Json) {
    if (item.type === "promotion") {
      const code = item.referencedId as string;
      const voucher = scenario.vouchers.find((entry) => entry.code === code);
      if (!voucher) {
        errors["promotion-not-found"] = {
          key: "promotion-not-found",
          messageKey: "promotion-not-found",
          level: 20,
          message: `Promotion with code ${code} not found!`,
          translatedMessage: `Gutscheincode "${code}" existiert nicht.`,
          promotionCode: code,
          parameters: { code },
        };
        return;
      }
      if (
        !lines.some(
          (line) => line.referencedId === code && line.type === "promotion",
        )
      ) {
        lines.push({
          id: `promotion-${code}`,
          type: "promotion",
          referencedId: code,
          quantity: 1,
          label: voucher.name,
          payload: { code },
          amount: voucher.amount,
        });
      }
      return;
    }
    const id = item.id as string;
    const quantity = item.quantity as number;
    const existing = lines.find((line) => line.id === id);
    if (item.type === "product") {
      const product = products.get(id);
      if (!product) {
        errors[`product-not-found${id}`] = {
          key: `product-not-found${id}`,
          messageKey: "product-not-found",
          level: 20,
          message: "The product %s could not be found",
          translatedMessage: "Das Produkt wurde nicht gefunden.",
          id,
          parameters: { id },
        };
        return;
      }
      if (product.childCount > 0) return;
      if (existing) existing.quantity += quantity;
      else
        lines.push({
          id,
          type: "product",
          referencedId: id,
          quantity,
          payload: {},
        });
      return;
    }
    // container (ShopBite plugin)
    const children = (item.children as Json[]).map((child) => ({
      id: child.id as string,
      referencedId:
        (child.referencedId as string | undefined) ?? (child.id as string),
    }));
    const main = products.get(children[0]!.referencedId);
    if (
      !main ||
      children.slice(1).some((child) => !products.has(child.referencedId))
    ) {
      errors[`product-not-found${children[0]!.referencedId}`] = {
        key: "product-not-found",
        messageKey: "product-not-found",
        level: 20,
      };
      return;
    }
    if (existing) {
      existing.quantity += quantity;
      return;
    }
    const without = ((item.payload as Json).without as string[]).filter(
      (name) => main.ingredients.some((ingredient) => ingredient.name === name),
    );
    const label = [
      main.name,
      ...children
        .slice(1)
        .map((child) => `+${products.get(child.referencedId)!.name}`),
      ...without.map((name) => `-${name}`),
    ].join(" ");
    lines.push({
      id,
      type: "container",
      referencedId: main.id,
      quantity,
      label,
      payload: { productNumber: main.productNumber, without },
      children,
    });
  }

  const visitorApi: VisitorStoreApi = {
    send: async <T>(request: {
      method: string;
      path: string;
      body?: Json;
      contextToken?: string;
    }) => {
      requests.push(structuredClone(request));
      const token = request.contextToken ?? `context-${++tokens}`;
      const lines = carts.get(token) ?? [];
      carts.set(token, lines);
      const errors: Json = {};
      const { method, path, body } = request;
      if (method === "POST" && path === "/checkout/cart/line-item") {
        for (const item of body!.items as Json[]) add(lines, item, errors);
      } else if (method === "PATCH" && path === "/checkout/cart/line-item") {
        for (const item of body!.items as Json[]) {
          const line = lines.find((entry) => entry.id === item.id);
          if (!line) throw httpError(404, "CHECKOUT__CART_LINE_ITEM_NOT_FOUND");
          if ((item.quantity as number) < 1) {
            throw httpError(400, "CHECKOUT__CART_INVALID_LINE_ITEM_QUANTITY");
          }
          line.quantity = item.quantity as number;
        }
      } else if (
        method === "POST" &&
        path === "/checkout/cart/line-item/delete"
      ) {
        for (const id of body!.ids as string[]) {
          const index = lines.findIndex((entry) => entry.id === id);
          if (index < 0)
            throw httpError(404, "CHECKOUT__CART_LINE_ITEM_NOT_FOUND");
          lines.splice(index, 1);
        }
      } else if (!(method === "GET" && path === "/checkout/cart")) {
        throw new Error(`unexpected ${method} ${path}`);
      }
      return {
        data: structuredClone(cartJson(lines, errors)) as T,
        contextToken: token,
      };
    },
  };

  const storeApi: StoreApi = {
    get: async <T>(path: string) => {
      if (path === "/context") return { currency: { isoCode: "EUR" } } as T;
      throw new Error(`unexpected GET ${path}`);
    },
    post: async <T>(path: string, body: Json) => {
      requests.push({ method: "POST", path, body: structuredClone(body) });
      if (path !== "/product") throw new Error(`unexpected POST ${path}`);
      const ids = body.ids as string[];
      return {
        elements: ids.flatMap((id) => {
          const product = products.get(id);
          return product ? [productJson(product)] : [];
        }),
      } as T;
    },
  };

  return { storeApi, visitorApi, requests, carts };
}

export const shopwareCart: AdapterFixture<CartScenario> = {
  adapter: "shopware",
  create: (scenario) => {
    const fake = fakeShopwareCart(scenario);
    return createShopwareBackend({
      storeApi: fake.storeApi,
      visitorApi: fake.visitorApi,
      storeUrl: "https://shop.example.com",
      timeZone: "Europe/Berlin",
      log: () => {},
    });
  },
};
