import { describe, expect, it } from "vitest";
import {
  parseListParam,
  dishLink,
  withQuickViewConfiguration,
} from "../../app/utils/productUrl";

describe("dishLink", () => {
  it("uses the dish's own link when the backend keeps one", () => {
    expect(
      dishLink(
        { number: "LF-21", path: "/Speisekarte/Pizza/?produkt=LF-21" },
        "/Speisekarte/Nudeln/",
      ),
    ).toBe("/Speisekarte/Pizza/?produkt=LF-21");
  });

  it("opens the dish's sheet over its section otherwise", () => {
    expect(
      dishLink({ number: "LF-21", path: null }, "/Speisekarte/Pizza/"),
    ).toBe("/Speisekarte/Pizza/?produkt=LF-21");
    expect(dishLink({ number: "A 1/2", path: null }, "c/Pizza/")).toBe(
      "/c/Pizza/?produkt=A+1%2F2",
    );
  });

  it("is undefined without a link and a section", () => {
    expect(dishLink({ number: "LF-21", path: null })).toBeUndefined();
  });
});

describe("parseListParam", () => {
  it("splits comma-separated and repeated values", () => {
    expect(parseListParam("Zwiebeln, Oliven,")).toEqual(["Zwiebeln", "Oliven"]);
    expect(parseListParam(["LF-500", "LF-501,LF-502"])).toEqual([
      "LF-500",
      "LF-501",
      "LF-502",
    ]);
    expect(parseListParam(undefined)).toEqual([]);
    expect(parseListParam([null])).toEqual([]);
  });
});

describe("withQuickViewConfiguration", () => {
  const query = {
    properties: "a|b",
    produkt: "LF-21",
    ohne: "Zwiebeln",
    extras: "LF-500",
  };

  it("replaces the configuration and keeps other parameters", () => {
    expect(
      withQuickViewConfiguration(query, {
        productNumber: "LF-21-groß",
        without: ["Zwiebeln", "Oliven"],
        extras: [],
      }),
    ).toEqual({
      properties: "a|b",
      produkt: "LF-21-groß",
      ohne: "Zwiebeln,Oliven",
    });
  });

  it("removes all three parameters without a configuration", () => {
    expect(withQuickViewConfiguration(query, undefined)).toEqual({
      properties: "a|b",
    });
  });
});
