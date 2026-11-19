import { describe, expect, it } from "vitest";
import {
  fulfillmentLeadTime,
  parseWishedTime,
  shippingLeadTime,
  wishedTimeComment,
} from "../../app/utils/leadTime";

const DELIVERY = "0190a3b0c1d27e0f8a9b0c1d2e3f4a5b";
const PICKUP = "0190a3b0c1d27e0f8a9b0c1d2e3f4a5c";

const config = {
  shippingMethods: [
    { id: DELIVERY, fulfillment: "delivery" as const, leadTimeMinutes: 45 },
    { id: PICKUP, fulfillment: "pickup" as const, leadTimeMinutes: 20 },
  ],
};

describe("shippingLeadTime", () => {
  it("takes the lead time and fulfillment the plugin reports", () => {
    expect(shippingLeadTime(config, { id: DELIVERY })).toEqual({
      fulfillment: "delivery",
      minutes: 45,
    });
    expect(shippingLeadTime(config, { id: PICKUP })).toEqual({
      fulfillment: "pickup",
      minutes: 20,
    });
  });

  it("has no lead time for a method the plugin does not list", () => {
    expect(shippingLeadTime(config, { id: "other" })).toEqual({
      fulfillment: "delivery",
      minutes: null,
    });
    expect(shippingLeadTime(null, undefined)).toEqual({
      fulfillment: "delivery",
      minutes: null,
    });
  });
});

describe("fulfillmentLeadTime", () => {
  it("returns the lead time of the first method of the fulfillment", () => {
    const many = {
      shippingMethods: [
        ...config.shippingMethods,
        { id: "x", fulfillment: "delivery" as const, leadTimeMinutes: 60 },
      ],
    };
    expect(fulfillmentLeadTime(many, "delivery")).toBe(45);
    expect(fulfillmentLeadTime(many, "pickup")).toBe(20);
  });

  it("is null without a method of the fulfillment", () => {
    expect(
      fulfillmentLeadTime(
        { shippingMethods: [config.shippingMethods[1]!] },
        "delivery",
      ),
    ).toBeNull();
    expect(fulfillmentLeadTime({ shippingMethods: [] }, "pickup")).toBeNull();
    expect(fulfillmentLeadTime(undefined, "delivery")).toBeNull();
  });
});

describe("wished time in the customer comment", () => {
  it("writes the prefix of the fulfillment", () => {
    expect(wishedTimeComment("delivery", "19:15")).toBe(
      "Wunschlieferzeit: 19:15",
    );
    expect(wishedTimeComment("pickup", "19:15")).toBe("Wunschabholzeit: 19:15");
  });

  it("reads both prefixes", () => {
    expect(parseWishedTime("Wunschlieferzeit: 19:15")).toBe("19:15");
    expect(parseWishedTime("Wunschabholzeit: 18:40")).toBe("18:40");
    expect(parseWishedTime(" Wunschabholzeit:18:40 ")).toBe("18:40");
  });

  it("keeps other comments", () => {
    expect(parseWishedTime("Bitte klingeln")).toBe("Bitte klingeln");
    expect(parseWishedTime(undefined)).toBeUndefined();
    expect(parseWishedTime(null)).toBeUndefined();
  });
});
