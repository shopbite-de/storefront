import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

// Create shared mocks to be exported by both '#imports' and '#app' in a hoisted-safe way
const shared = vi.hoisted(() => ({
  useHead: vi.fn(),
  useSeoMeta: vi.fn(),
}));

// Mock Nuxt auto-imports via `#imports`
vi.mock("#imports", async () => {
  const vue = await import("vue");

  // Expose mocks for inspection in tests
  return {
    ...vue,
    useRuntimeConfig: () => ({
      public: {
        site: { name: "My Store" },
        storeUrl: "https://example.com",
      },
    }),
    useHead: shared.useHead,
    useSeoMeta: shared.useSeoMeta,
  };
});

// Some auto-imports may resolve from '#app' depending on transform, mirror the same mocks
vi.mock("#app", async () => {
  const vue = await import("vue");
  return {
    ...vue,
    useRuntimeConfig: () => ({
      public: {
        site: { name: "My Store" },
        storeUrl: "https://example.com",
      },
    }),
    useHead: shared.useHead,
    useSeoMeta: shared.useSeoMeta,
  };
});

// Re-import the mocks for assertions
import { useHead, useSeoMeta } from "#imports";

// Target under test will be dynamically imported after setting up globals
let useCategorySeo: (arg: any) => any;

describe("useCategorySeo", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Provide globals for auto-imported functions (when not transformed in unit env)
    const vue = await import("vue");
    (globalThis as any).computed = vue.computed;
    (globalThis as any).ref = vue.ref;
    (globalThis as any).useRuntimeConfig = () => ({
      public: { site: { name: "My Store" }, storeUrl: "https://example.com" },
    });
    (globalThis as any).useHead = useHead;
    (globalThis as any).useSeoMeta = useSeoMeta;

    // Dynamic import after globals are ready
    useCategorySeo = (await import("../../app/composables/useCategorySeo"))
      .useCategorySeo;
  });

  it("computes core SEO refs and injects head tags", () => {
    const category = ref<any>({
      translated: {
        metaTitle: "Pizza & Pasta",
        metaDescription: "Leckere Pizza und Pasta bestellen",
        breadcrumb: ["Speisen", "Italienisch", "Pasta"],
      },
      seoUrl: "/c/pasta",
      active: true,
      media: { url: "https://example.com/img/pasta.jpg" },
    });

    const result = useCategorySeo(category);

    // Returned refs
    expect(result.pageTitle.value).toBe(
      "Pizza & Pasta | Speisekarte | My Store",
    );
    expect(result.canonicalUrl.value).toBe("https://example.com/c/pasta");
    expect(result.robots.value).toBe("index,follow");

    // useSeoMeta should be called once with expected keys
    expect(
      useSeoMeta as unknown as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledTimes(1);

    // useHead should receive canonical link and JSON-LD scripts
    expect(
      useHead as unknown as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledTimes(1);
    const headArg = (useHead as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];

    // Canonical link
    const link = headArg.link?.[0];
    expect(link).toMatchObject({
      rel: "canonical",
      href: "https://example.com/c/pasta",
    });

    // JSON-LD scripts
    const scripts = headArg.script || [];
    expect(scripts.length).toBeGreaterThanOrEqual(2);

    const collection = JSON.parse(scripts[0].innerHTML);
    expect(collection["@type"]).toBe("CollectionPage");
    expect(collection.url).toBe("https://example.com/c/pasta");
    expect(collection.image?.[0]).toBe("https://example.com/img/pasta.jpg");

    const breadcrumb = JSON.parse(scripts[1].innerHTML);
    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    const items = breadcrumb.itemListElement;
    // Home item
    expect(items[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://example.com",
    });
    // Last item should include canonical URL
    const last = items[items.length - 1];
    expect(last.item).toBe("https://example.com/c/pasta");
  });

  it("sets robots to noindex when category is inactive", () => {
    const category = ref<any>({
      translated: { name: "Salate" },
      active: false,
      seoUrl: "/c/salate",
    });

    const result = useCategorySeo(category);
    expect(result.robots.value).toBe("noindex,nofollow");
  });
});
