import { describe, it, expect, vi } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { useNavigation } from "~/composables/useNavigation";
import { navNode } from "../support/navigation";

// Navigations from the BFF as domain nodes (ADR 0001, step 3).
registerEndpoint("/api/navigation/main", () => [
  navNode({
    label: "Speisekarte",
    path: "/Speisekarte/",
    icon: "i-lucide-utensils",
    children: [navNode({ label: "Pizza", path: "/Speisekarte/Pizza/" })],
  }),
  navNode({
    label: "Instagram",
    kind: "link",
    path: "https://instagram.example.com",
    external: true,
  }),
]);
registerEndpoint("/api/navigation/footer", () => [
  navNode({
    label: "Rechtliches",
    kind: "group",
    children: [
      navNode({ label: "Impressum", kind: "link", path: "/impressum" }),
    ],
  }),
]);
registerEndpoint("/api/navigation/menu", () => [
  navNode({ label: "Pizza", path: "/Speisekarte/Pizza/" }),
]);

describe("useNavigation", () => {
  it("maps the nodes to menu items: path, new tab, icon", async () => {
    const { mainMenu, mainNavigation } = useNavigation(false);
    await vi.waitFor(() => expect(mainNavigation.value).toHaveLength(2));

    expect(mainMenu.value).toEqual([
      {
        label: "Speisekarte",
        to: "/Speisekarte/",
        target: undefined,
        icon: "i-lucide-utensils",
        children: undefined,
      },
      {
        label: "Instagram",
        to: "https://instagram.example.com",
        target: "_blank",
        icon: undefined,
        children: undefined,
      },
    ]);
  });

  it("keeps the children when asked, a group without a link", async () => {
    const { footerMenu, footerNavigation, menuCardNavigation } =
      useNavigation(true);
    await vi.waitFor(() => expect(footerNavigation.value).toHaveLength(1));

    expect(footerMenu.value).toEqual([
      {
        label: "Rechtliches",
        to: undefined,
        target: undefined,
        icon: undefined,
        children: [
          {
            label: "Impressum",
            to: "/impressum",
            target: undefined,
            icon: undefined,
            children: undefined,
          },
        ],
      },
    ]);
    await vi.waitFor(() => expect(menuCardNavigation.value).toHaveLength(1));
  });
});
