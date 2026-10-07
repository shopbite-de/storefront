import { describe, expect, it } from "vitest";
import { splitHighlight } from "../../app/utils/highlight";

describe("splitHighlight", () => {
  it("keeps text without highlights as one part", () => {
    expect(splitHighlight("Pizzeria La Fattoria")).toEqual([
      { text: "Pizzeria La Fattoria", highlight: false },
    ]);
  });

  it("splits the MDC highlight syntax", () => {
    expect(
      splitHighlight("Alle [Informationen]{.text-primary} auf einen Blick"),
    ).toEqual([
      { text: "Alle ", highlight: false },
      { text: "Informationen", highlight: true },
      { text: " auf einen Blick", highlight: false },
    ]);
  });

  it("handles a highlight at the end", () => {
    expect(
      splitHighlight(
        "Italienische Küche aus der [Alten Schmiede.]{.text-primary}",
      ),
    ).toEqual([
      { text: "Italienische Küche aus der ", highlight: false },
      { text: "Alten Schmiede.", highlight: true },
    ]);
  });
});
