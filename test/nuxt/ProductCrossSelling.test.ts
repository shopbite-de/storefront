import { describe, it, expect } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import ProductCrossSelling from "~/components/Product/CrossSelling.vue";
import type { AssociationItem } from "~/types/Association";

mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedPrice: (price: number) => `${price.toFixed(2)} €`,
}));

const group = (label: string, count: number): AssociationItem => ({
  label,
  products: Array.from({ length: count }, (_, index) => ({
    label: `${label} ${index + 1}`,
    value: `${label}-${index + 1}`,
    price: "1.00 €",
    unitPrice: 1,
  })),
});

const rows = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
  wrapper.findAll('[role="checkbox"]');

describe("ProductCrossSelling", () => {
  it("opens only the first group", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { associations: [group("Extras", 3), group("Saucen", 2)] },
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
      props: { associations: [group("Extras", 8)] },
    });

    expect(rows(wrapper)).toHaveLength(8);
    expect(wrapper.text()).not.toContain("anzeigen");
  });

  it("shows the first entries of a long list and the rest on request", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { associations: [group("Extras", 12)] },
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
      props: { associations: [group("Extras", 20)] },
    });

    const search = wrapper.find('input[aria-label="Extras durchsuchen"]');
    await search.setValue("extras 1");
    // "Extras 1" and "Extras 10" … "Extras 19"
    expect(rows(wrapper)).toHaveLength(11);

    await search.setValue("nichts");
    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain("Keine Treffer");
  });

  it("emits the selection and summarises it in the group header", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { associations: [group("Extras", 3), group("Saucen", 2)] },
    });

    expect(wrapper.text()).toContain("optional");
    await rows(wrapper)[0]!.trigger("click");
    await rows(wrapper)[2]!.trigger("click");

    const emitted = wrapper.emitted("extras-selected")!;
    expect(emitted.at(-1)![0]).toMatchObject([
      { value: "Extras-1" },
      { value: "Extras-3" },
    ]);
    expect(wrapper.find("button[aria-expanded]").text()).toContain(
      "2 gewählt · +2.00 €",
    );

    await rows(wrapper)[0]!.trigger("click");
    expect(wrapper.emitted("extras-selected")!.at(-1)![0]).toMatchObject([
      { value: "Extras-3" },
    ]);
  });
});
