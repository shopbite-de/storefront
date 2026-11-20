import { describe, expect, it } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { ExtraGroup } from "../../shared/domain";
import ProductDeselectIngredient from "~/components/Product/DeselectIngredient.vue";
import ProductCrossSelling from "~/components/Product/CrossSelling.vue";
import { eur } from "../support/dishes";

// The dish sheet of a shop with a style preset (#442).
mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  menuView: "bon",
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedMoney: (price: { amountMinor: number }) =>
    `${(price.amountMinor / 100).toFixed(2)} €`,
}));

const ingredients = ["Pilze", "Salami", "Schinken"].map((name) => ({
  id: name.toLowerCase(),
  name,
}));

const extras = (count: number): ExtraGroup => ({
  id: "extras",
  name: "Extras",
  extras: Array.from({ length: count }, (_, index) => ({
    id: `extra-${index + 1}`,
    number: `E${index + 1}`,
    name: `Extra ${index + 1}`,
    price: eur(100),
    available: true,
  })),
});

describe("dish sheet with a preset (#442)", () => {
  it("shows the ingredients as chips, pressed while included", async () => {
    const wrapper = await mountSuspended(ProductDeselectIngredient, {
      props: { ingredients, initialDeselected: ["Pilze"] },
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
      props: { groups: [extras(3)], initialExtras: ["E2"] },
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
      id: string;
    }[];
    expect(emitted.map((extra) => extra.id)).toEqual(["extra-2", "extra-1"]);
  });

  it("adds a labelled search field above a long list", async () => {
    const wrapper = await mountSuspended(ProductCrossSelling, {
      props: { groups: [extras(20)] },
    });

    const input = wrapper.find('input[type="search"]');
    expect(wrapper.find(`label[for="${input.attributes("id")}"]`).text()).toBe(
      "Extras durchsuchen",
    );
    await input.setValue("Extra 1");
    expect(wrapper.findAll('[role="checkbox"]').length).toBe(11);
  });
});
