import { describe, expect, it } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { Schemas } from "#shopware";
import ProductDeselectIngredient from "~/components/Product/DeselectIngredient.vue";
import ProductCrossSelling from "~/components/Product/CrossSelling.vue";
import type { AssociationItem } from "~/types/Association";

// The product sheet of a shop with a style preset (#442).
mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  hasPreset: true,
  menuView: "bon",
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedPrice: (price: number) => `${price.toFixed(2)} €`,
}));

const product = {
  properties: ["Pilze", "Salami", "Schinken"].map((name) => ({
    group: { name: "Hauptzutaten" },
    translated: { name },
  })),
} as unknown as Schemas["Product"];

const extras = (count: number): AssociationItem => ({
  label: "Extras",
  products: Array.from({ length: count }, (_, index) => ({
    label: `Extra ${index + 1}`,
    value: `extra-${index + 1}`,
    productNumber: `E${index + 1}`,
    price: "1.00 €",
    unitPrice: 1,
  })),
});

describe("product sheet with a preset (#442)", () => {
  it("shows the ingredients as chips, pressed while included", async () => {
    const wrapper = await mountSuspended(ProductDeselectIngredient, {
      props: { product, initialDeselected: ["Pilze"] },
    });

    const group = wrapper.find('[role="group"]');
    const label = wrapper.find(`[id="${group.attributes("aria-labelledby")}"]`);
    expect(label.text()).toBe("Zutaten");

    const chips = group.findAll("button");
    expect(chips.map((chip) => chip.text())).toEqual([
      "ohne Pilze",
      "Salami",
      "Schinken",
    ]);
    expect(chips.map((chip) => chip.attributes("aria-pressed"))).toEqual([
      "false",
      "true",
      "true",
    ]);

    await chips[1]!.trigger("click");
    expect(wrapper.emitted("ingredients-deselected")?.at(-1)).toEqual([
      ["Pilze", "Salami"],
    ]);

    await chips[0]!.trigger("click");
    expect(wrapper.emitted("ingredients-deselected")?.at(-1)).toEqual([
      ["Salami"],
    ]);
  });

  it("lists the extras as labelled checkboxes with their price", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { associations: [extras(3)], initialExtras: ["E2"] },
    });

    const checkboxes = wrapper.findAll('[role="checkbox"]');
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes.map((box) => box.attributes("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    const label = wrapper.find(
      `label[for="${checkboxes[0]!.attributes("id")}"]`,
    );
    expect(label.text()).toContain("Extra 1");
    expect(label.text()).toContain("+1.00 €");

    await checkboxes[0]!.trigger("click");
    const emitted = wrapper.emitted("extras-selected")?.at(-1)?.[0] as {
      value: string;
    }[];
    expect(emitted.map((extra) => extra.value)).toEqual(["extra-2", "extra-1"]);
  });

  it("adds a labelled search field above a long list", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { associations: [extras(20)] },
    });

    const input = wrapper.find('input[type="search"]');
    expect(wrapper.find(`label[for="${input.attributes("id")}"]`).text()).toBe(
      "Extras durchsuchen",
    );
    await input.setValue("Extra 1");
    expect(wrapper.findAll('[role="checkbox"]').length).toBe(11);
  });
});
