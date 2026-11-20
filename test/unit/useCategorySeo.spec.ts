import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import type { MenuSection } from "../../shared/domain";

// Re-import the mocks for assertions
import { useHead, useSeoMeta } from "#imports";

// Create shared mocks to be exported by both '#imports' and '#app' in a hoisted-safe way
const shared = vi.hoisted(() => ({
  useHead: vi.fn(),
  useSeoMeta: vi.fn(),
  runtimeConfig: {
    public: {
      site: {
        name: "My Store",
        titleTemplate: "%s | %siteName – Online bestellen",
      },
    },
  },
  siteConfig: { url: "https://example.com" },
}));

// Mock Nuxt auto-imports via `#imports`
vi.mock("#imports", async () => {
  const vue = await import("vue");

  // Expose mocks for inspection in tests
  return {
    ...vue,
    useRuntimeConfig: () => shared.runtimeConfig,
    useSiteConfig: () => shared.siteConfig,
    useHead: shared.useHead,
    useSeoMeta: shared.useSeoMeta,
  };
});

// Some auto-imports may resolve from '#app' depending on transform, mirror the same mocks
vi.mock("#app", async () => {
  const vue = await import("vue");
  return {
    ...vue,
    useRuntimeConfig: () => shared.runtimeConfig,
    useSiteConfig: () => shared.siteConfig,
    useHead: shared.useHead,
    useSeoMeta: shared.useSeoMeta,
  };
});

// Target under test will be dynamically imported after setting up globals
type UseCategorySeo =
  (typeof import("../../app/composables/useCategorySeo"))["useCategorySeo"];
let useCategorySeo: UseCategorySeo;
const section = (fields: Partial<MenuSection>): MenuSection => ({
  id: "s1",
  name: "Pizza",
  description: null,
  icon: null,
  media: null,
  path: "/c/pizza/",
  seo: { title: null, description: null, indexable: true },
  children: [],
  ...fields,
});

describe("useCategorySeo", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Provide globals for auto-imported functions (when not transformed in unit env)
    const vue = await import("vue");
    (globalThis as Record<string, unknown>).computed = vue.computed;
    (globalThis as Record<string, unknown>).ref = vue.ref;
    (globalThis as Record<string, unknown>).useRuntimeConfig = () =>
      shared.runtimeConfig;
    (globalThis as Record<string, unknown>).useSiteConfig = () =>
      shared.siteConfig;
    (globalThis as Record<string, unknown>).useHead = useHead;
    (globalThis as Record<string, unknown>).useSeoMeta = useSeoMeta;

    // Dynamic import after globals are ready
    useCategorySeo = (await import("../../app/composables/useCategorySeo"))
      .useCategorySeo;
  });

  it("computes core SEO refs and injects head tags", () => {
    const category = ref(
      section({
        name: "Pasta",
        description: "Nudeln aus eigener Herstellung",
        path: "/c/pasta/",
        media: {
          url: "https://example.com/img/pasta.jpg",
          alt: null,
          width: null,
          height: null,
          sources: [],
        },
        seo: {
          title: "Pizza & Pasta",
          description: "Leckere Pizza und Pasta bestellen",
          indexable: true,
        },
      }),
    );

    const result = useCategorySeo(category);

    // Returned refs: the <title> template is applied globally, og/twitter
    // titles carry it explicitly
    expect(result.pageTitle.value).toBe("Pizza & Pasta");
    expect(result.fullTitle.value).toBe(
      "Pizza & Pasta | My Store – Online bestellen",
    );
    expect(result.canonicalUrl.value).toBe("https://example.com/c/pasta/");
    expect(result.pageDescription.value).toBe(
      "Leckere Pizza und Pasta bestellen",
    );
    // Active categories leave the robots rule to @nuxtjs/robots
    expect(result.robots.value).toBeUndefined();

    // useSeoMeta should be called once with expected keys
    expect(
      useSeoMeta as unknown as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledTimes(1);
    const seoArg = (useSeoMeta as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]![0]!;
    expect(seoArg.ogTitle.value).toBe(
      "Pizza & Pasta | My Store – Online bestellen",
    );

    // useHead should receive canonical link and JSON-LD scripts
    expect(
      useHead as unknown as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledTimes(1);
    const headArg = (useHead as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]![0]!;

    // Canonical link keeps the trailing slash of the SEO URL
    const link = headArg.link?.[0];
    expect(link).toMatchObject({
      rel: "canonical",
      href: "https://example.com/c/pasta/",
    });

    // JSON-LD scripts
    const scripts = headArg.script || [];
    expect(scripts.length).toBeGreaterThanOrEqual(1);

    const collection = JSON.parse(scripts[0].innerHTML);
    expect(collection["@type"]).toBe("CollectionPage");
    expect(collection.url).toBe("https://example.com/c/pasta/");
    expect(collection.image?.[0]).toBe("https://example.com/img/pasta.jpg");
  });

  it("falls back to name and description without SEO texts", () => {
    const result = useCategorySeo(
      ref(section({ name: "Salate", description: "Frisch" })),
    );
    expect(result.pageTitle.value).toBe("Salate");
    expect(result.pageDescription.value).toBe("Frisch");
  });

  it("leaves the description out without one, so no default is rendered", () => {
    const result = useCategorySeo(ref(section({ name: "Salate" })));
    expect(result.pageDescription.value).toBeNull();
  });

  it("sets robots to noindex for a section off the menu", () => {
    const result = useCategorySeo(
      ref(
        section({
          name: "Salate",
          path: "/c/salate",
          seo: { title: null, description: null, indexable: false },
        }),
      ),
    );
    expect(result.robots.value).toBe("noindex,nofollow");
  });
});
