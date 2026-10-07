import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { nextTick, ref } from "vue";
import SbButton from "~/components/Sb/Button.vue";
import SbIconButton from "~/components/Sb/IconButton.vue";
import SbChip from "~/components/Sb/Chip.vue";
import SbStepper from "~/components/Sb/Stepper.vue";
import SbField from "~/components/Sb/Field.vue";
import SbInput from "~/components/Sb/Input.vue";
import SbSegmentedControl from "~/components/Sb/SegmentedControl.vue";
import SbChoiceGroup from "~/components/Sb/ChoiceGroup.vue";
import SbCheckbox from "~/components/Sb/Checkbox.vue";

describe("Sb base components (#440)", () => {
  it("SbButton renders a button, or a link with `to`", async () => {
    const button = await mountSuspended(SbButton, {
      props: { type: "submit" },
      slots: { default: () => "Bestellen" },
    });
    expect(button.find("button").attributes("type")).toBe("submit");
    expect(button.text()).toBe("Bestellen");

    const link = await mountSuspended(SbButton, {
      props: { to: "/speisekarte" },
      slots: { default: () => "Speisekarte" },
    });
    expect(link.find("a").attributes("href")).toBe("/speisekarte");
  });

  it("SbButton disables itself while loading", async () => {
    const wrapper = await mountSuspended(SbButton, {
      props: { loading: true },
      slots: { default: () => "Bestellen" },
    });
    const button = wrapper.find("button");
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.attributes("aria-busy")).toBe("true");
  });

  it("SbIconButton has its label as accessible name", async () => {
    const wrapper = await mountSuspended(SbIconButton, {
      props: { label: "Schließen" },
    });
    expect(wrapper.find("button").attributes("aria-label")).toBe("Schließen");
  });

  it("SbChip ingredient reads 'ohne' when off and keeps its name", async () => {
    const wrapper = await mountSuspended(SbChip, {
      props: { label: "Pilze", variant: "ingredient", modelValue: true },
    });
    const button = wrapper.find("button");
    expect(button.attributes("aria-pressed")).toBe("true");
    expect(button.text()).toBe("Pilze");

    await button.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([false]);
    await wrapper.setProps({ modelValue: false });
    expect(button.text()).toBe("ohne Pilze");
    expect(button.attributes("aria-label")).toBe("Pilze");
    expect(button.attributes("aria-pressed")).toBe("false");
  });

  it("SbStepper counts and offers removal at the minimum", async () => {
    const wrapper = await mountSuspended(SbStepper, {
      props: { itemName: "Pizza Mix", modelValue: 2, removable: true },
    });
    const [minus, plus] = wrapper.findAll("button");
    expect(wrapper.attributes("aria-label")).toBe("Menge Pizza Mix");
    expect(plus!.attributes("aria-label")).toBe("Pizza Mix, eine mehr");

    await plus!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([3]);

    await wrapper.setProps({ modelValue: 1 });
    expect(minus!.attributes("aria-label")).toBe("Pizza Mix entfernen");
    await minus!.trigger("click");
    expect(wrapper.emitted("remove")).toHaveLength(1);
  });

  it("SbField wires label, hint and error to the control", async () => {
    const wrapper = await mountSuspended(
      {
        components: { SbField, SbInput },
        setup: () => ({ value: ref("") }),
        template: `
          <SbField label="Telefon" hint="Nur für Rückfragen" error="Bitte geben Sie eine Telefonnummer an." v-slot="{ id, describedBy, invalid }">
            <SbInput :id="id" v-model="value" :aria-describedby="describedBy" :invalid="invalid" />
          </SbField>`,
      },
      {},
    );
    const input = wrapper.find("input");
    const label = wrapper.find("label");
    expect(label.attributes("for")).toBe(input.attributes("id"));
    expect(input.attributes("aria-invalid")).toBe("true");

    const describedBy = input.attributes("aria-describedby")!.split(" ");
    const texts = describedBy.map((id) => wrapper.find(`[id="${id}"]`).text());
    expect(texts).toEqual([
      "Bitte geben Sie eine Telefonnummer an.",
      "Nur für Rückfragen",
    ]);
  });

  it("SbField marks optional fields only", async () => {
    const wrapper = await mountSuspended(SbField, {
      props: { label: "Hinweis für den Fahrer", optional: true },
    });
    expect(wrapper.find("label").text()).toContain("(optional)");
  });

  it("SbSegmentedControl is a labelled radio group", async () => {
    const wrapper = await mountSuspended(SbSegmentedControl, {
      props: {
        label: "Bestellart",
        modelValue: "delivery",
        options: [
          { value: "delivery", label: "Lieferung" },
          { value: "pickup", label: "Abholung" },
        ],
      },
    });
    expect(wrapper.find('[role="radiogroup"]').attributes("aria-label")).toBe(
      "Bestellart",
    );
    const radios = wrapper.findAll('[role="radio"]');
    expect(radios.map((radio) => radio.attributes("aria-checked"))).toEqual([
      "true",
      "false",
    ]);

    await radios[1]!.trigger("click");
    await nextTick();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["pickup"]);
  });

  it("SbChoiceGroup names the group by its legend and marks required", async () => {
    const wrapper = await mountSuspended(SbChoiceGroup, {
      props: {
        legend: "Fleisch",
        required: true,
        options: [
          { value: "kalb", label: "Kalb" },
          { value: "haehnchen", label: "Hähnchen" },
        ],
      },
    });
    const group = wrapper.find('[role="radiogroup"]');
    const legend = wrapper.find(
      `[id="${group.attributes("aria-labelledby")}"]`,
    );
    expect(legend.text()).toContain("Fleisch");
    expect(legend.text()).toContain("Pflicht");
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(2);
  });

  it("SbCheckbox is labelled by its row", async () => {
    const wrapper = await mountSuspended(SbCheckbox, {
      props: { label: "Artischocken", trailing: "+1,00 €" },
    });
    const checkbox = wrapper.find('[role="checkbox"]');
    const label = wrapper.find("label");
    expect(label.attributes("for")).toBe(checkbox.attributes("id"));
    expect(label.text()).toContain("Artischocken");
    expect(label.text()).toContain("+1,00 €");

    await checkbox.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([true]);
  });
});
