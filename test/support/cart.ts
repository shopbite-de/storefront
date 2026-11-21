import type { Cart, CartLine } from "../../shared/domain";
import { eur } from "./dishes";

/**
 * Carts in domain terms for app tests (the answers of `/api/cart`).
 * Literal values: app code imports nothing but types from shared/.
 */
export function cartLine(fields: Partial<CartLine> = {}): CartLine {
  return {
    id: "line-1",
    configuration: {
      dishId: "d21",
      variantId: null,
      extraIds: [],
      removedIngredientIds: [],
    },
    dishNumber: "21",
    name: "Pizza Margherita",
    variant: [],
    extras: [],
    removedIngredients: [],
    quantity: 1,
    unitPrice: eur(700),
    totalPrice: eur(700),
    media: null,
    ...fields,
  };
}

export function cart(fields: Partial<Cart> = {}): Cart {
  return {
    lines: [],
    discounts: [],
    subtotal: eur(0),
    shippingCosts: eur(0),
    total: eur(0),
    taxes: [],
    shippingMethodId: null,
    paymentMethodId: null,
    messages: [],
    ...fields,
  };
}
