import { describe, it, expect } from "vitest";
import { useProductVariants } from "../../app/composables/useProductVariants";
import { ref } from "vue";

describe("useProductVariants", () => {
  it("should return empty object when no settings provided", () => {
    const settings = ref([]);
    const { variants } = useProductVariants(settings as any);
    expect(variants.value).toEqual({});
  });

  it("should group options by group id", () => {
    const settings = ref([
      {
        option: {
          id: "opt-1",
          name: "Small",
          group: {
            id: "group-size",
            name: "Size",
            translated: { name: "Größe" }
          },
          translated: { name: "Klein" }
        }
      },
      {
        option: {
          id: "opt-2",
          name: "Large",
          group: {
            id: "group-size",
            name: "Size",
            translated: { name: "Größe" }
          },
          translated: { name: "Groß" }
        }
      },
      {
        option: {
          id: "opt-3",
          name: "Red",
          group: {
            id: "group-color",
            name: "Color",
            translated: { name: "Farbe" }
          },
          translated: { name: "Rot" }
        }
      }
    ]);

    const { variants } = useProductVariants(settings as any);
    
    expect(variants.value["group-size"]).toBeDefined();
    expect(variants.value["group-size"].name).toBe("Größe");
    expect(variants.value["group-size"].options).toHaveLength(2);
    expect(variants.value["group-size"].options[0]).toEqual({
      label: "Klein",
      value: "opt-1",
      productId: "opt-1"
    });

    expect(variants.value["group-color"]).toBeDefined();
    expect(variants.value["group-color"].name).toBe("Farbe");
    expect(variants.value["group-color"].options).toHaveLength(1);
  });

  it("should avoid duplicate options", () => {
    const settings = ref([
      {
        option: {
          id: "opt-1",
          name: "Small",
          group: { id: "group-size", name: "Size" }
        }
      },
      {
        option: {
          id: "opt-1",
          name: "Small",
          group: { id: "group-size", name: "Size" }
        }
      }
    ]);

    const { variants } = useProductVariants(settings as any);
    expect(variants.value["group-size"].options).toHaveLength(1);
  });
});
