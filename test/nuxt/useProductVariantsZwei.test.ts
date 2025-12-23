import { describe, it, expect } from "vitest";
import { useProductVariantsZwei } from "../../app/composables/useProductVariantsZwei";
import { ref } from "vue";

describe("useProductVariantsZwei", () => {
  it("should return empty object when no settings provided", () => {
    const settings = ref([]);
    const { variants } = useProductVariantsZwei(settings);
    expect(variants.value).toEqual({});
  });

  it("should group options by group", () => {
    const settings = ref([
      {
        id: "group-size",
        name: "Size",
        translated: { name: "Größe" },
        options: [
          { id: "opt-1", name: "Small", translated: { name: "Klein" } },
          { id: "opt-2", name: "Large", translated: { name: "Groß" } }
        ]
      }
    ]);

    const { variants } = useProductVariantsZwei(settings);
    
    expect(variants.value["group-size"]).toBeDefined();
    expect(variants.value["group-size"]?.name).toBe("Größe");
    expect(variants.value["group-size"]?.options).toHaveLength(2);
    expect(variants.value["group-size"]?.options[0]?.label).toBe("Klein");
  });

  it("should avoid duplicate options", () => {
    const settings = ref([
      {
        id: "group-size",
        name: "Size",
        options: [
          { id: "opt-1", name: "Small" },
          { id: "opt-1", name: "Small" }
        ]
      }
    ]);

    const { variants } = useProductVariantsZwei(settings);
    expect(variants.value["group-size"]?.options).toHaveLength(1);
  });
});
