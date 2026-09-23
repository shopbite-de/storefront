import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import HomeMenuCategories from "~/components/Home/MenuCategories.vue";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke: mockInvoke },
}));

function category(
  id: string,
  name: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    name,
    translated: { name },
    seoUrl: `/Speisekarte/${name}/`,
    customFields: { shopbite_category_icon: "i-lucide-pizza" },
    media: null,
    ...extra,
  };
}

describe("HomeMenuCategories", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    // useAsyncData keeps the last answer under its key across the cases
    clearNuxtData("home-menu-categories");
  });

  it("renders one tile per menu section with its photo or icon", async () => {
    mockInvoke.mockResolvedValue({
      data: [
        category("1", "Pizza", {
          media: {
            url: "https://cdn.example.com/pizza.jpg",
            thumbnails: [
              { url: "https://cdn.example.com/pizza-400.jpg", width: 400 },
            ],
            metaData: { width: 800, height: 600 },
          },
        }),
        category("2", "Pasta"),
      ],
    });

    const wrapper = await mountSuspended(HomeMenuCategories, {
      props: { title: "Unsere Speisekarte" },
    });

    const tiles = wrapper.findAll("[data-testid=menu-categories] li");
    expect(tiles).toHaveLength(2);
    expect(tiles[0]?.find("a").attributes("href")).toBe("/Speisekarte/Pizza/");
    expect(tiles[0]?.find("img").attributes("srcset")).toContain("400w");
    expect(tiles[1]?.find("img").exists()).toBe(false);
    expect(wrapper.text()).toContain("Pasta");

    const [operation, options] = mockInvoke.mock.calls[0] ?? [];
    expect(operation).toBe(
      "readNavigation post /navigation/{activeId}/{rootId}",
    );
    expect(options.body.includes.category).toContain("media");
  });

  it("caps the tiles and links to the whole menu", async () => {
    mockInvoke.mockResolvedValue({
      data: Array.from({ length: 4 }, (_, i) =>
        category(String(i), `Bereich ${i}`),
      ),
    });

    const wrapper = await mountSuspended(HomeMenuCategories, {
      props: { limit: 3 },
    });

    const tiles = wrapper.findAll("[data-testid=menu-categories] li");
    expect(tiles).toHaveLength(4);
    expect(tiles[3]?.find("a").attributes("href")).toBe("/speisekarte/");
    expect(tiles[3]?.text()).toContain("4 Bereiche");
  });

  it("renders nothing without menu sections", async () => {
    mockInvoke.mockResolvedValue({ data: [] });

    const wrapper = await mountSuspended(HomeMenuCategories);

    expect(wrapper.find("[data-testid=menu-categories]").exists()).toBe(false);
  });
});
