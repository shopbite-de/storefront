import { describe, expect, it } from "vitest";
import {
  fulfillmentLeadTime,
  parseWishedTime,
  shippingLeadTime,
  wishedTimeComment,
} from "../../app/utils/leadTime";
import type { Fulfillment, ShippingMethod } from "../../shared/domain";

const DELIVERY = "0190a3b0c1d27e0f8a9b0c1d2e3f4a5b";
const PICKUP = "0190a3b0c1d27e0f8a9b0c1d2e3f4a5c";

const method = (
  id: string,
  fulfillment: Fulfillment,
  minutes: number | null,
): ShippingMethod => ({
  id,
  name: id,
  description: null,
  fulfillment,
  leadTime: minutes === null ? null : { minutes },
  media: null,
});

const config = [method(DELIVERY, "delivery", 45), method(PICKUP, "pickup", 20)];

describe("shippingLeadTime", () => {
  it("takes the lead time and fulfillment of the method", () => {
    expect(shippingLeadTime(config, DELIVERY)).toEqual({
      fulfillment: "delivery",
      minutes: 45,
    });
    expect(shippingLeadTime(config, PICKUP)).toEqual({
      fulfillment: "pickup",
      minutes: 20,
    });
  });

  it("has no lead time for a method the shop does not list", () => {
    expect(shippingLeadTime(config, "other")).toEqual({
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
    const many = [...config, method("x", "delivery", 60)];
    expect(fulfillmentLeadTime(many, "delivery")).toBe(45);
    expect(fulfillmentLeadTime(many, "pickup")).toBe(20);
  });

  it("is null without a method of the fulfillment", () => {
    expect(fulfillmentLeadTime([config[1]!], "delivery")).toBeNull();
    expect(fulfillmentLeadTime([], "pickup")).toBeNull();
    expect(fulfillmentLeadTime(undefined, "delivery")).toBeNull();
  });

  it("is null when the first method of the fulfillment has no lead time", () => {
    expect(
      fulfillmentLeadTime([method("p", "pickup", null)], "pickup"),
    ).toBeNull();
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
