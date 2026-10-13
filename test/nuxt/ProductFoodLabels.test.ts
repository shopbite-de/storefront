import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import type { Schemas } from "#shopware";
import ProductFoodLabels from "~/components/Product/FoodLabels.vue";

const option = (code: string, name: string) => ({
  name,
  translated: { name, customFields: { shopbite_code: code } },
});

const dish = (
  allergens: [string, string][],
  checked = false,
): Schemas["Product"] =>
  ({
    translated: {
      customFields: checked ? { shopbite_allergens_checked: true } : {},
    },
    sortedProperties: allergens.length
      ? [
          {
            translated: { name: "Allergene" },
            options: allergens.map(([code, name]) => option(code, name)),
          },
        ]
      : [],
  }) as unknown as Schemas["Product"];

async function openPopover(product: Schemas["Product"]) {
  const wrapper = await mountSuspended(ProductFoodLabels, {
    props: { product },
    attachTo: document.body,
  });
  const button = wrapper.get("button");
  expect(button.attributes("aria-label")).toBe("Allergene und Zusatzstoffe");
  expect(wrapper.find('[data-testid="food-labels"]').exists()).toBe(false);
  await button.trigger("click");
  await flushPromises();
  return wrapper;
}

describe("food labels behind the info button (#500)", () => {
  it("shows the allergens only after a click", async () => {
    const wrapper = await openPopover(
      dish([
        ["A", "Weizen"],
        ["G", "Milch (inkl. Laktose)"],
      ]),
    );
    expect(wrapper.get('[data-testid="food-labels"]').text()).toContain(
      "Enthält: Weizen, Milch (inkl. Laktose).",
    );
    wrapper.unmount();
  });

  it("says 'without' only when the restaurant checked the lists", async () => {
    const checked = await openPopover(dish([], true));
    expect(checked.get('[data-testid="food-labels"]').text()).toContain(
      "Ohne kennzeichnungspflichtige Allergene und Zusatzstoffe.",
    );
    checked.unmount();

    const unchecked = await openPopover(dish([]));
    const text = unchecked.get('[data-testid="food-labels"]').text();
    expect(text).toContain("Angaben erhalten Sie im Restaurant");
    expect(text).not.toContain("Ohne");
    unchecked.unmount();
  });
});
