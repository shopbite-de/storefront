import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { defineComponent, h } from "vue";
import { DialogTitle } from "reka-ui";
import SbSheet from "~/components/Sb/Sheet.vue";

// A custom header (product sheet) gets its own row below the actions, so
// a long dish name is not squeezed next to three 44 px buttons.
describe("SbSheet header", () => {
  it("puts the actions and close into a toolbar above a custom header", async () => {
    const Host = defineComponent(
      () => () =>
        h(
          SbSheet,
          { open: true, title: "Hähnchenbrustfilet Paniert m. Kroketten" },
          {
            header: () =>
              h(DialogTitle, { "data-test": "title" }, () => "Titel"),
            actions: () => h("button", { "data-test": "save" }, "Merken"),
            default: () => h("p", "Inhalt"),
          },
        ),
    );
    await mountSuspended(Host);

    const header = document.body.querySelector("header")!;
    const [toolbar, content] = [...header.children];
    expect(toolbar!.querySelector('[data-test="save"]')).not.toBeNull();
    expect(toolbar!.querySelector('[aria-label="Schließen"]')).not.toBeNull();
    expect(content!.querySelector('[data-test="title"]')).not.toBeNull();
  });

  it("keeps title and close in one row without a custom header", async () => {
    const Host = defineComponent(
      () => () =>
        h(SbSheet, { open: true, title: "Warenkorb" }, () => h("p", "Inhalt")),
    );
    await mountSuspended(Host);

    const header = [...document.body.querySelectorAll("header")].at(-1)!;
    expect(header.className).toContain("items-start");
    expect(header.textContent).toContain("Warenkorb");
  });
});
