import { describe, it, expect } from "vitest";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import Categories from "~/components/Home/Categories.vue";
import { navNode } from "../support/navigation";

// The menu sections of the home page with their photos (domain Media).
registerEndpoint("/api/navigation/home", () => [
  navNode({
    label: "Pizza",
    path: "/Speisekarte/Pizza/",
    media: {
      url: "https://cdn.example.com/pizza.webp",
      alt: null,
      width: 800,
      height: 1000,
      sources: [
        { url: "https://cdn.example.com/pizza-800.webp", width: 800 },
        { url: "https://cdn.example.com/pizza-400.webp", width: 400 },
      ],
    },
  }),
  navNode({ label: "Salate", path: "/Speisekarte/Salate/" }),
  // a link without a path is left out
  navNode({ label: "Leer", kind: "link", path: null }),
]);

describe("HomeCategories", () => {
  it("lists the sections with a path and shows the first photo", async () => {
    const wrapper = await mountSuspended(Categories);

    const links = wrapper.findAll("ul a");
    expect(links.map((link) => [link.text(), link.attributes("href")])).toEqual(
      [
        ["Pizza", "/Speisekarte/Pizza/"],
        ["Salate", "/Speisekarte/Salate/"],
      ],
    );
    const img = wrapper.find("figure img");
    expect(img.attributes("src")).toBe("https://cdn.example.com/pizza.webp");
    expect(img.attributes("srcset")).toBe(
      "https://cdn.example.com/pizza-400.webp 400w, https://cdn.example.com/pizza-800.webp 800w",
    );
    // 4:5 photo in a 500 px high box
    expect(img.attributes("sizes")).toBe("400px");
    expect(wrapper.find("figcaption").text()).toBe("Pizza");
  });
});
