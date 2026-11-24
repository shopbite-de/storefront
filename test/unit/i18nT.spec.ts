import { createSSRApp, h, type Slots } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import I18nT from "../../i18n/runtime/I18nT";

/** `<i18n-t>` on the shop's (German, Node test project) messages. */
async function render(
  props: Record<string, unknown>,
  slots: Record<string, () => unknown>,
) {
  const app = createSSRApp({
    render: () => h(I18nT, props as never, slots as unknown as Slots),
  });
  return renderToString(app);
}

describe("<i18n-t>", () => {
  it("fills a placeholder with its slot, the text around it from the message", async () => {
    const html = await render(
      { keypath: "order.confirmation.number", tag: "p", class: "lead" },
      { number: () => h("strong", "10042") },
    );
    expect(html).toMatch(/^<p class="lead">.*<strong>10042<\/strong>.*<\/p>$/);
    expect(html).not.toContain("{number}");
    expect(html).not.toContain("order.confirmation");
  });

  it("renders a fragment without a tag", async () => {
    const html = await render(
      { keypath: "account.addressFields.didYouMean" },
      { suggestion: () => h("strong", "Hauptstraße 1") },
    );
    expect(html).toContain("<strong>Hauptstraße 1</strong>");
    expect(html).not.toMatch(/^<span/);
  });
});
