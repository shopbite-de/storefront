import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import HomeFaq from "~/components/Home/Faq.vue";

const items = [
  { question: "Wohin liefern Sie?", answer: "Nach Obertshausen." },
  { question: "Wie kann ich bezahlen?", answer: "Bar oder mit EC-Karte." },
];

describe("HomeFaq", () => {
  it("renders every answer in the markup, collapsed", async () => {
    const wrapper = await mountSuspended(HomeFaq, { props: { items } });

    const details = wrapper.findAll("details");
    expect(details).toHaveLength(2);
    expect(details.every((d) => d.attributes("open") === undefined)).toBe(true);
    expect(wrapper.find("summary").text()).toBe("Wohin liefern Sie?");
    expect(wrapper.text()).toContain("Bar oder mit EC-Karte.");
    expect(wrapper.text()).toContain("Häufige Fragen");
  });

  it("adds FAQPage JSON-LD to the head", async () => {
    await mountSuspended(HomeFaq, { props: { items } });
    // unhead renders the DOM debounced
    await new Promise((resolve) => setTimeout(resolve, 50));

    const schemas = [
      ...document.head.querySelectorAll('script[type="application/ld+json"]'),
    ].map((script) => JSON.parse(script.textContent ?? "{}"));
    const schema = schemas.find((entry) => entry["@type"] === "FAQPage");
    expect(schema).toBeDefined();
    expect(schema!.mainEntity).toHaveLength(2);
  });
});
