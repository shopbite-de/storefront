import { expect, it } from "vitest";
import {
  dishConfiguration,
  isDomainError,
  type Cart,
  type CartLine,
} from "../../shared/domain";
import type { BackendSession } from "../../server/ports";
import { defineContract } from "./harness";

/** A dish of the scenario, prices in euros. */
export type CartScenarioDish = Readonly<{
  id: string;
  number: string;
  name: string;
  price: number;
  ingredients: readonly Readonly<{ id: string; name: string }>[];
  extras: readonly Readonly<{
    id: string;
    number: string;
    name: string;
    price: number;
  }>[];
  variants: readonly Readonly<{
    id: string;
    number: string;
    price: number;
    /** group name → option name */
    options: readonly Readonly<{ group: string; option: string }>[];
  }>[];
}>;

/** The menu and the vouchers the CartPort suite orders from. */
export type CartScenario = Readonly<{
  dishes: readonly CartScenarioDish[];
  /** A fixed discount in euros (negative). */
  vouchers: readonly Readonly<{ code: string; name: string; amount: number }>[];
}>;

export const MARGHERITA = "0b1d2c3a4e5f40718293a4b5c6d7e8f9";
export const SALAMI = "8d9e0f1a2b3c44d5e6f7a8b9c0d1e2f3";
export const LARGE = "1c2d3e4f5a6b47c8d9e0f1a2b3c4d5e6";
export const COLA = "2d3e4f5a6b7c48d9e0f1a2b3c4d5e6f7";
export const CHEESE = "3e4f5a6b7c8d49e0f1a2b3c4d5e6f7a8";
export const OLIVES = "4f5a6b7c8d9e40f1a2b3c4d5e6f7a8b9";
export const TOMATO = "5a6b7c8d9e0f41a2b3c4d5e6f7a8b9c0";
export const MOZZARELLA = "6b7c8d9e0f1a42b3c4d5e6f7a8b9c0d1";
export const BASIL = "7c8d9e0f1a2b43c4d5e6f7a8b9c0d1e2";

export const PIZZERIA: CartScenario = {
  dishes: [
    {
      id: MARGHERITA,
      number: "21",
      name: "Pizza Margherita",
      price: 9.5,
      ingredients: [
        { id: TOMATO, name: "Tomaten" },
        { id: MOZZARELLA, name: "Mozzarella" },
        { id: BASIL, name: "Basilikum" },
      ],
      extras: [
        { id: CHEESE, number: "X1", name: "Extra Käse", price: 1.5 },
        { id: OLIVES, number: "X2", name: "Oliven", price: 1 },
      ],
      variants: [],
    },
    {
      id: SALAMI,
      number: "22",
      name: "Pizza Salami",
      price: 10.5,
      ingredients: [{ id: TOMATO, name: "Tomaten" }],
      extras: [{ id: CHEESE, number: "X1", name: "Extra Käse", price: 1.5 }],
      variants: [
        {
          id: LARGE,
          number: "22G",
          price: 12.5,
          options: [{ group: "Größe", option: "Groß 40 cm" }],
        },
      ],
    },
    {
      id: COLA,
      number: "80",
      name: "Cola 0,33 l",
      price: 3,
      ingredients: [],
      extras: [],
      variants: [],
    },
  ],
  vouchers: [{ code: "WILLKOMMEN", name: "Willkommensrabatt", amount: -2 }],
};

/** A visitor's session as the BFF hands it to the adapter. */
export function testSession(initial?: string): BackendSession & {
  state: () => string | undefined;
} {
  let state = initial;
  return {
    read: async () => state,
    write: async (next) => {
      state = next;
    },
    state: () => state,
  };
}

const euros = (value: { amountMinor: number }) => value.amountMinor / 100;

const summary = (line: CartLine) => ({
  dish: line.configuration.dishId,
  variant: line.configuration.variantId,
  extras: line.extras.map((extra) => extra.name),
  removed: line.removedIngredients,
  quantity: line.quantity,
});

async function rejection(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call();
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to fail");
}

export const cartContract = defineContract<"cart", CartScenario>(
  "cart",
  (given) => {
    it("is empty for a visitor without state", async () => {
      const cart = await given(PIZZERIA);
      const empty = await cart.getCart(testSession());

      expect(empty.lines).toEqual([]);
      expect(empty.discounts).toEqual([]);
      expect(euros(empty.subtotal)).toBe(0);
      expect(euros(empty.total)).toBe(0);
      expect(empty.subtotal.currency).toBe("EUR");
    });

    it("adds a plain dish as one line and keeps the visitor's state", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();

      const answer = await cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        2,
      );

      expect(session.state()).toBeDefined();
      expect(answer.lines).toHaveLength(1);
      const [line] = answer.lines;
      expect(line).toMatchObject({
        configuration: {
          dishId: COLA,
          variantId: null,
          extraIds: [],
          removedIngredientIds: [],
        },
        dishNumber: "80",
        name: "Cola 0,33 l",
        variant: [],
        extras: [],
        removedIngredients: [],
        quantity: 2,
      });
      expect(euros(line!.unitPrice)).toBe(3);
      expect(euros(line!.totalPrice)).toBe(6);
      expect(euros(answer.subtotal)).toBe(6);
      expect(euros(answer.total)).toBe(6);
      // the next request of the same visitor finds it again
      expect((await cart.getCart(session)).lines.map(summary)).toEqual([
        summary(line!),
      ]);
    });

    it("merges the same plain dish into its line", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();
      await cart.addLine(session, dishConfiguration({ dishId: COLA }), 1);
      const answer = await cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        2,
      );

      expect(answer.lines.map(summary)).toEqual([
        { dish: COLA, variant: null, extras: [], removed: [], quantity: 3 },
      ]);
    });

    it("prices a dish with extras and removed ingredients as one line", async () => {
      const cart = await given(PIZZERIA);
      const answer = await cart.addLine(
        testSession(),
        dishConfiguration({
          dishId: MARGHERITA,
          extraIds: [OLIVES, CHEESE],
          removedIngredientIds: [BASIL],
        }),
        2,
      );

      expect(answer.lines).toHaveLength(1);
      const [line] = answer.lines;
      expect(line).toMatchObject({
        configuration: {
          dishId: MARGHERITA,
          variantId: null,
          removedIngredientIds: [BASIL],
        },
        dishNumber: "21",
        name: "Pizza Margherita",
        removedIngredients: ["Basilikum"],
        quantity: 2,
      });
      expect([...line!.configuration.extraIds].sort()).toEqual(
        [CHEESE, OLIVES].sort(),
      );
      // in the order the guest chose them
      expect(
        line!.extras.map((extra) => [
          extra.id,
          extra.name,
          euros(extra.unitPrice),
        ]),
      ).toEqual([
        [OLIVES, "Oliven", 1],
        [CHEESE, "Extra Käse", 1.5],
      ]);
      expect(euros(line!.unitPrice)).toBe(12);
      expect(euros(line!.totalPrice)).toBe(24);
      expect(euros(answer.subtotal)).toBe(24);
    });

    it("merges the same configuration, whatever the order of its parts", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();
      await cart.addLine(
        session,
        dishConfiguration({
          dishId: MARGHERITA,
          extraIds: [CHEESE, OLIVES],
          removedIngredientIds: [BASIL, TOMATO],
        }),
        1,
      );
      const answer = await cart.addLine(
        session,
        dishConfiguration({
          dishId: MARGHERITA,
          extraIds: [OLIVES, CHEESE],
          removedIngredientIds: [TOMATO, BASIL],
        }),
        1,
      );

      expect(answer.lines).toHaveLength(1);
      expect(answer.lines[0]!.quantity).toBe(2);
    });

    it("keeps configurations that differ only in their removals apart", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();
      await cart.addLine(
        session,
        dishConfiguration({
          dishId: MARGHERITA,
          removedIngredientIds: [BASIL],
        }),
        1,
      );
      await cart.addLine(
        session,
        dishConfiguration({
          dishId: MARGHERITA,
          removedIngredientIds: [TOMATO],
        }),
        1,
      );
      const answer = await cart.addLine(
        session,
        dishConfiguration({ dishId: MARGHERITA }),
        1,
      );

      expect(answer.lines.map(summary)).toEqual([
        {
          dish: MARGHERITA,
          variant: null,
          extras: [],
          removed: ["Basilikum"],
          quantity: 1,
        },
        {
          dish: MARGHERITA,
          variant: null,
          extras: [],
          removed: ["Tomaten"],
          quantity: 1,
        },
        {
          dish: MARGHERITA,
          variant: null,
          extras: [],
          removed: [],
          quantity: 1,
        },
      ]);
      expect(new Set(answer.lines.map((line) => line.id)).size).toBe(3);
    });

    it("orders a variant with its number, price and options", async () => {
      const cart = await given(PIZZERIA);
      const answer = await cart.addLine(
        testSession(),
        dishConfiguration({
          dishId: SALAMI,
          variantId: LARGE,
          extraIds: [CHEESE],
        }),
        1,
      );

      const [line] = answer.lines;
      expect(line).toMatchObject({
        configuration: { dishId: SALAMI, variantId: LARGE, extraIds: [CHEESE] },
        dishNumber: "22G",
        name: "Pizza Salami",
        variant: [{ group: "Größe", option: "Groß 40 cm" }],
      });
      expect(euros(line!.unitPrice)).toBe(14);
    });

    it("changes the quantity of a line; 0 removes it", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();
      const added = await cart.addLine(
        session,
        dishConfiguration({ dishId: MARGHERITA, extraIds: [CHEESE] }),
        1,
      );
      await cart.addLine(session, dishConfiguration({ dishId: COLA }), 1);
      const lineId = added.lines[0]!.id;

      const changed = await cart.changeQuantity(session, lineId, 3);
      expect(changed.lines.find((line) => line.id === lineId)?.quantity).toBe(
        3,
      );
      expect(
        euros(changed.lines.find((line) => line.id === lineId)!.totalPrice),
      ).toBe(33);
      expect(euros(changed.subtotal)).toBe(36);

      const removed = await cart.changeQuantity(session, lineId, 0);
      expect(removed.lines.map((line) => line.configuration.dishId)).toEqual([
        COLA,
      ]);
    });

    it("removes a line", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();
      const added = await cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        1,
      );

      const answer = await cart.removeLine(session, added.lines[0]!.id);

      expect(answer.lines).toEqual([]);
      expect(euros(answer.total)).toBe(0);
    });

    it("refuses lines the cart does not hold", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();
      await cart.addLine(session, dishConfiguration({ dishId: COLA }), 1);

      for (const call of [
        () =>
          cart.changeQuantity(session, "0f0f0f0f0f0f4f0f8f0f0f0f0f0f0f0f", 2),
        () => cart.removeLine(session, "0f0f0f0f0f0f4f0f8f0f0f0f0f0f0f0f"),
      ]) {
        expect(isDomainError(await rejection(call), "not_found")).toBe(true);
      }
    });

    it("refuses a dish the menu does not offer, and a dish that needs a variant", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();
      await cart.addLine(session, dishConfiguration({ dishId: COLA }), 1);

      for (const configuration of [
        dishConfiguration({ dishId: "9f9f9f9f9f9f4f9f8f9f9f9f9f9f9f9f" }),
        dishConfiguration({
          dishId: "9f9f9f9f9f9f4f9f8f9f9f9f9f9f9f9f",
          extraIds: [CHEESE],
        }),
        dishConfiguration({ dishId: SALAMI }),
        dishConfiguration({ dishId: SALAMI, extraIds: [CHEESE] }),
      ]) {
        const error = await rejection(() =>
          cart.addLine(session, configuration, 1),
        );
        expect(isDomainError(error, "dish_unavailable")).toBe(true);
      }
      expect((await cart.getCart(session)).lines.map(summary)).toEqual([
        { dish: COLA, variant: null, extras: [], removed: [], quantity: 1 },
      ]);
    });

    it("refuses extras the menu does not offer, removals the dish does not have, and odd quantities", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();

      const calls = [
        () =>
          cart.addLine(
            session,
            dishConfiguration({
              dishId: MARGHERITA,
              extraIds: ["8e8e8e8e8e8e4e8e8e8e8e8e8e8e8e8e"],
            }),
            1,
          ),
        () =>
          cart.addLine(
            session,
            dishConfiguration({
              dishId: MARGHERITA,
              removedIngredientIds: [CHEESE],
            }),
            1,
          ),
        () => cart.addLine(session, dishConfiguration({ dishId: COLA }), 0),
        () => cart.addLine(session, dishConfiguration({ dishId: COLA }), 1.5),
        () => cart.addLine(session, dishConfiguration({ dishId: COLA }), 101),
      ];
      for (const call of calls) {
        expect(isDomainError(await rejection(call), "invalid_value")).toBe(
          true,
        );
      }
      const added = await cart.addLine(
        session,
        dishConfiguration({ dishId: COLA }),
        1,
      );
      expect(
        isDomainError(
          await rejection(() =>
            cart.changeQuantity(session, added.lines[0]!.id, -1),
          ),
          "invalid_value",
        ),
      ).toBe(true);
    });

    it("applies a voucher as a discount with its code and removes it again", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();
      await cart.addLine(session, dishConfiguration({ dishId: COLA }), 3);

      const applied = await cart.applyVoucher(session, "WILLKOMMEN");
      expect(
        applied.discounts.map((discount) => [
          discount.code,
          discount.name,
          euros(discount.amount),
        ]),
      ).toEqual([["WILLKOMMEN", "Willkommensrabatt", -2]]);
      expect(euros(applied.subtotal)).toBe(7);
      expect(euros(applied.total)).toBe(7);
      expect(applied.lines).toHaveLength(1);

      const removed = await cart.removeVoucher(session, "WILLKOMMEN");
      expect(removed.discounts).toEqual([]);
      expect(euros(removed.subtotal)).toBe(9);
    });

    it("answers an unknown voucher with a message about its code", async () => {
      const cart = await given(PIZZERIA);
      const session = testSession();
      await cart.addLine(session, dishConfiguration({ dishId: COLA }), 1);

      const answer = await cart.applyVoucher(session, "GIBTSNICHT");

      expect(answer.discounts).toEqual([]);
      expect(answer.messages).toContainEqual(
        expect.objectContaining({
          code: "voucher_invalid",
          subjectId: "GIBTSNICHT",
        }),
      );
    });

    it("keeps the carts of two visitors apart", async () => {
      const cart = await given(PIZZERIA);
      const alice = testSession();
      const bob = testSession();
      await Promise.all([
        cart.addLine(alice, dishConfiguration({ dishId: COLA }), 1),
        cart.addLine(bob, dishConfiguration({ dishId: MARGHERITA }), 1),
      ]);

      expect(alice.state()).not.toBe(bob.state());
      expect((await cart.getCart(alice)).lines.map(summary)).toEqual([
        { dish: COLA, variant: null, extras: [], removed: [], quantity: 1 },
      ]);
      expect((await cart.getCart(bob)).lines.map(summary)).toEqual([
        {
          dish: MARGHERITA,
          variant: null,
          extras: [],
          removed: [],
          quantity: 1,
        },
      ]);
    });

    it("answers values a caller cannot change", async () => {
      const cart = await given(PIZZERIA);
      const answer: Cart = await cart.addLine(
        testSession(),
        dishConfiguration({ dishId: MARGHERITA, extraIds: [CHEESE] }),
        1,
      );
      expect(Object.isFrozen(answer)).toBe(true);
      expect(Object.isFrozen(answer.lines)).toBe(true);
      expect(Object.isFrozen(answer.lines[0])).toBe(true);
      expect(Object.isFrozen(answer.lines[0]!.configuration)).toBe(true);
      expect(Object.isFrozen(answer.lines[0]!.extras[0])).toBe(true);
    });
  },
);
