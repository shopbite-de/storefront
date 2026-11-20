import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import ProductConfigurator from "~/components/Product/Configurator.vue";
import { pizzaWithSizes, variant } from "../support/dishes";

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

// `$fetch` is a Nuxt auto-import (bound at module load).
mockNuxtImport("$fetch", () => mockFetch);

const detail = pizzaWithSizes();

async function mountConfigurator(selectedOptionIds: string[] = ["normal"]) {
  return await mountSuspended(ProductConfigurator, {
    props: {
      dishId: detail.id,
      groups: detail.variantGroups,
      selectedOptionIds,
    },
  });
}

describe("ProductConfigurator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers each variant group as a required choice, the selected variant's options chosen", async () => {
    const wrapper = await mountConfigurator();

    const radios = wrapper.findAll('[role="radio"]');
    expect(radios.map((radio) => radio.text())).toEqual([
      "Normal 30 cm",
      "Groß 40 cm",
    ]);
    expect(radios.map((radio) => radio.attributes("aria-checked"))).toEqual([
      "true",
      "false",
    ]);
    expect(wrapper.text()).toContain("Größe");
  });

  it("asks the BFF for the variant of the chosen options and emits it", async () => {
    const gross = variant();
    mockFetch.mockResolvedValue(gross);
    const wrapper = await mountConfigurator();

    await wrapper.findAll('[role="radio"]')[1]!.trigger("click");
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/menu/dishes/${detail.id}/variant`,
      { query: { options: "gross" } },
    );
    expect(wrapper.emitted("variant-switched")?.[0]).toEqual([gross]);
  });

  it("keeps the dish when no variant has the options", async () => {
    mockFetch.mockResolvedValue(null);
    const wrapper = await mountConfigurator([]);

    await wrapper.findAll('[role="radio"]')[0]!.trigger("click");
    await flushPromises();

    expect(wrapper.emitted("variant-switched")).toBeUndefined();
  });

  it("keeps the dish when the variant cannot be loaded", async () => {
    mockFetch.mockRejectedValue(new Error("down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await mountConfigurator();

    await wrapper.findAll('[role="radio"]')[1]!.trigger("click");
    await flushPromises();

    expect(wrapper.emitted("variant-switched")).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
