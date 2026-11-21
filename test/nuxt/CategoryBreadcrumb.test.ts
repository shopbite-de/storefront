import { describe, it, expect } from "vitest";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import Breadcrumb from "~/components/Category/Breadcrumb.vue";

// The breadcrumb of a menu section from the BFF (BreadcrumbItem[]).
const PIZZA = "12eb9087c8335ca9a74cc6485fa36b34";
registerEndpoint(`/api/breadcrumb/${PIZZA}`, () => [
  { label: "Speisekarte", path: "/Speisekarte/" },
  { label: "Pizza", path: "/Speisekarte/Pizza/" },
]);

describe("CategoryBreadcrumb", () => {
  it("links the sections above and marks the current one", async () => {
    const wrapper = await mountSuspended(Breadcrumb, {
      props: { categoryId: PIZZA },
    });

    const nav = wrapper.find('nav[aria-label="Brotkrumen"]');
    const links = nav.findAll("a");
    expect(links.map((link) => [link.text(), link.attributes("href")])).toEqual(
      [["Speisekarte", "/Speisekarte/"]],
    );
    const current = nav.find('[aria-current="page"]');
    expect(current.text()).toBe("Pizza");
  });
});
