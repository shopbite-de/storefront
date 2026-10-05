import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import type { Schemas } from "#shopware";
import ProductDeselectIngredient from "~/components/Product/DeselectIngredient.vue";

const product = {
  properties: ["Tomatensoße", "Zwiebeln", "Oliven"].map((name) => ({
    group: { name: "Hauptzutaten" },
    translated: { name },
  })),
} as unknown as Schemas["Product"];

describe("ProductDeselectIngredient", () => {
  it("starts without deselected ingredients", async () => {
    const wrapper = await mountSuspended(ProductDeselectIngredient, {
      props: { product },
    });

    expect(wrapper.emitted("ingredients-deselected")).toBeUndefined();
    expect(wrapper.findAll('[aria-pressed="true"]')).toHaveLength(0);
  });

  it("deselects ingredients from the URL and ignores unknown names (#411)", async () => {
    const wrapper = await mountSuspended(ProductDeselectIngredient, {
      props: { product, initialDeselected: ["Zwiebeln", "Salami"] },
    });

    expect(wrapper.emitted("ingredients-deselected")?.[0]).toEqual([
      ["Zwiebeln"],
    ]);
    const pressed = wrapper.findAll('[aria-pressed="true"]');
    expect(pressed.map((button) => button.text())).toEqual(["Zwiebeln"]);
  });
});
