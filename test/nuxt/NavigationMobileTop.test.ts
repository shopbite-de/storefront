import { describe, it, expect, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import { ref } from "vue";
import MobileTop from "~/components/Navigation/MobileTop.vue";
import { navNode } from "../support/navigation";

// A menu where Fleischgerichte has sub-sections, Pizza has none.
vi.mock("~/composables/useNavigation", async () => {
  const { navNode: node } = await import("../support/navigation");
  return {
    useNavigation: () => ({
      menuCardNavigation: ref([
        node({ label: "Pizza", path: "/speisekarte/pizza/" }),
        node({
          label: "Fleischgerichte",
          path: "/speisekarte/fleischgerichte/",
          children: [
            node({
              label: "Vom Rind",
              path: "/speisekarte/fleischgerichte/vom-rind/",
            }),
            node({
              label: "Vom Kalb",
              path: "/speisekarte/fleischgerichte/vom-kalb/",
            }),
          ],
        }),
      ]),
    }),
  };
});
void navNode;

type Row = {
  label: string | undefined;
  links: { text: string; current: string | undefined }[];
};

function chips(wrapper: VueWrapper): Row[] {
  return wrapper.findAll("ul").map((list) => ({
    label: list.attributes("aria-label"),
    links: list.findAll("a").map((link) => ({
      text: link.text(),
      current: link.attributes("aria-current"),
    })),
  }));
}

describe("NavigationMobileTop", () => {
  it("shows only the sections on a section without sub-sections", async () => {
    const wrapper = await mountSuspended(MobileTop, {
      route: "/speisekarte/pizza/",
    });

    const rows = chips(wrapper);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.links).toEqual([
      { text: "Pizza", current: "page" },
      { text: "Fleischgerichte", current: undefined },
    ]);
  });

  it("lists the sub-sections of the open section in a second row", async () => {
    const wrapper = await mountSuspended(MobileTop, {
      route: "/speisekarte/fleischgerichte/",
    });

    const rows = chips(wrapper);
    expect(rows[1]!.label).toBe("Unterkategorien von Fleischgerichte");
    expect(rows[1]!.links).toEqual([
      { text: "Alle", current: "page" },
      { text: "Vom Rind", current: undefined },
      { text: "Vom Kalb", current: undefined },
    ]);
  });

  it("keeps the section and its row open on a sub-section", async () => {
    const wrapper = await mountSuspended(MobileTop, {
      route: "/speisekarte/fleischgerichte/vom-kalb/",
    });

    const rows = chips(wrapper);
    const section = wrapper.find("[data-section]");
    expect(section.text()).toBe("Fleischgerichte");
    expect(section.classes()).toContain("bg-sb-ink");
    expect(rows[1]!.links.find((link) => link.current)).toEqual({
      text: "Vom Kalb",
      current: "page",
    });
  });
});
