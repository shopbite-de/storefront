import { describe, it, expect } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import ProductCrossSelling from "~/components/Product/CrossSelling.vue";
import type { ExtraGroup } from "../../shared/domain";
import { eur } from "../support/dishes";

mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedMoney: (price: { amountMinor: number }) =>
    `${(price.amountMinor / 100).toFixed(2)} €`,
}));

const group = (name: string, count: number): ExtraGroup => ({
  id: name.toLowerCase(),
  name,
  extras: Array.from({ length: count }, (_, index) => ({
    id: `${name}-${index + 1}`,
    number: `${name}-NR-${index + 1}`,
    name: `${name} ${index + 1}`,
    price: eur(100),
    available: true,
  })),
});

const rows = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
  wrapper.findAll('[role="checkbox"]');

describe("ProductCrossSelling", () => {
  it("opens only the first group", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { groups: [group("Extras", 3), group("Saucen", 2)] },
    });

    const toggles = wrapper.findAll("button[aria-expanded]");
    expect(toggles.map((toggle) => toggle.attributes("aria-expanded"))).toEqual(
      ["true", "false"],
    );
    expect(rows(wrapper)).toHaveLength(3);

    await toggles[1]!.trigger("click");
    expect(rows(wrapper)).toHaveLength(5);
  });

  it("shows every entry of a short list", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { groups: [group("Extras", 8)] },
    });

    expect(rows(wrapper)).toHaveLength(8);
    expect(wrapper.text()).not.toContain("anzeigen");
  });

  it("shows the first entries of a long list and the rest on request", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { groups: [group("Extras", 12)] },
    });

    expect(rows(wrapper)).toHaveLength(6);
    const showAll = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Alle 12 anzeigen"));
    await showAll!.trigger("click");
    expect(rows(wrapper)).toHaveLength(12);
  });

  it("offers a search field for very long lists", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { groups: [group("Extras", 20)] },
    });

    const search = wrapper.find('input[type="search"]');
    expect(search.attributes("placeholder")).toBe("20 Extras durchsuchen");
    await search.setValue("extras 1");
    // "Extras 1" and "Extras 10" … "Extras 19"
    expect(rows(wrapper)).toHaveLength(11);

    await search.setValue("nichts");
    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain("Keine Treffer");
  });

  it("emits the selection and summarises it in the group header", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { groups: [group("Extras", 3), group("Saucen", 2)] },
    });

    expect(wrapper.text()).toContain("optional");
    await rows(wrapper)[0]!.trigger("click");
    await rows(wrapper)[2]!.trigger("click");

    const emitted = wrapper.emitted("extras-selected")!;
    expect(emitted.at(-1)![0]).toMatchObject([
      { id: "Extras-1" },
      { id: "Extras-3" },
    ]);
    expect(wrapper.find("button[aria-expanded]").text()).toContain(
      "2 gewählt · +2.00 €",
    );

    await rows(wrapper)[0]!.trigger("click");
    expect(wrapper.emitted("extras-selected")!.at(-1)![0]).toMatchObject([
      { id: "Extras-3" },
    ]);
  });

  it("preselects extras from the URL and emits them (#411)", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: {
        groups: [group("Extras", 3)],
        initialExtras: ["Extras-NR-2", "unknown"],
      },
    });

    const emitted = wrapper.emitted("extras-selected");
    expect(emitted?.[0]?.[0]).toEqual([
      expect.objectContaining({ number: "Extras-NR-2" }),
    ]);
    const checked = rows(wrapper).map(
      (row: { attributes: (name: string) => string | undefined }) =>
        row.attributes("aria-checked"),
    );
    expect(checked).toEqual(["false", "true", "false"]);
  });
});
