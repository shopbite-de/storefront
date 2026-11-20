import { expect, it } from "vitest";
import type { Fulfillment } from "../../shared/domain";
import { defineContract } from "./harness";

/** One shipping method of the scenario, in domain terms. */
export type ShippingMethodScenario = Readonly<{
  id: string;
  name: string;
  description: string | null;
  fulfillment: Fulfillment;
  /** Minutes; null when the backend does not know one. */
  leadTimeMinutes: number | null;
}>;

/** The shop's shipping methods as the CheckoutPort suite describes them. */
export type CheckoutScenario = Readonly<{
  /** In the shop's order. */
  shippingMethods: readonly ShippingMethodScenario[];
}>;

export const DELIVERY_AND_PICKUP: CheckoutScenario = {
  shippingMethods: [
    {
      id: "delivery",
      name: "Lieferung",
      description: "Wir bringen Ihre Bestellung.",
      fulfillment: "delivery",
      leadTimeMinutes: 45,
    },
    {
      id: "pickup",
      name: "Abholung",
      description: null,
      fulfillment: "pickup",
      leadTimeMinutes: 15,
    },
  ],
};

export const checkoutContract = defineContract<"checkout", CheckoutScenario>(
  "checkout",
  (given) => {
    it("lists the shipping methods with fulfillment and lead time, in the shop's order", async () => {
      const checkout = await given(DELIVERY_AND_PICKUP);
      const methods = await checkout.listShippingMethods();
      expect(
        methods.map(({ id, name, description, fulfillment, leadTime }) => ({
          id,
          name,
          description,
          fulfillment,
          leadTime,
        })),
      ).toEqual([
        {
          id: "delivery",
          name: "Lieferung",
          description: "Wir bringen Ihre Bestellung.",
          fulfillment: "delivery",
          leadTime: { minutes: 45 },
        },
        {
          id: "pickup",
          name: "Abholung",
          description: null,
          fulfillment: "pickup",
          leadTime: { minutes: 15 },
        },
      ]);
    });

    it("keeps several methods of one fulfillment", async () => {
      const checkout = await given({
        shippingMethods: [
          ...DELIVERY_AND_PICKUP.shippingMethods,
          {
            id: "express",
            name: "Expresslieferung",
            description: null,
            fulfillment: "delivery",
            leadTimeMinutes: 20,
          },
        ],
      });
      const methods = await checkout.listShippingMethods();
      expect(methods.map(({ id, fulfillment }) => [id, fulfillment])).toEqual([
        ["delivery", "delivery"],
        ["pickup", "pickup"],
        ["express", "delivery"],
      ]);
    });

    it("has no lead time where the backend knows none", async () => {
      const checkout = await given({
        shippingMethods: [
          {
            id: "pickup",
            name: "Abholung",
            description: null,
            fulfillment: "pickup",
            leadTimeMinutes: null,
          },
        ],
      });
      const [method] = await checkout.listShippingMethods();
      expect(method?.leadTime).toBeNull();
      expect(method?.fulfillment).toBe("pickup");
    });

    it("lists nothing for a shop without shipping methods", async () => {
      const checkout = await given({ shippingMethods: [] });
      expect(await checkout.listShippingMethods()).toEqual([]);
    });

    it("answers values a caller cannot change", async () => {
      const checkout = await given(DELIVERY_AND_PICKUP);
      const methods = await checkout.listShippingMethods();
      expect(Object.isFrozen(methods)).toBe(true);
      expect(Object.isFrozen(methods[0])).toBe(true);
      expect(Object.isFrozen(methods[0]?.leadTime)).toBe(true);
    });
  },
);
