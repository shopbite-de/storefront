import type { MenuSection } from "../../shared/domain";
import { formatPageTitle, toAbsoluteUrl } from "../utils/seo";

/** Title, description, canonical path and image of a menu section's page. */
export function useCategorySeo(section: Ref<MenuSection | null | undefined>) {
  const config = useRuntimeConfig();
  const siteConfig = useSiteConfig();
  const storeName = config.public.site?.name || "";

  const pageTitle = computed(
    () => section.value?.seo.title ?? section.value?.name,
  );

  // <title> gets the template via app.vue; og/twitter titles need it spelled out.
  const fullTitle = computed(() =>
    formatPageTitle(
      pageTitle.value,
      storeName,
      config.public.site?.titleTemplate ?? "",
    ),
  );

  // null without a description: the tag is left out, never the site's
  // default description
  const pageDescription = computed(
    () => section.value?.seo.description ?? section.value?.description ?? null,
  );

  const seoUrl = computed(() =>
    toAbsoluteUrl(siteConfig.url, section.value?.path ?? ""),
  );

  const ogImage = computed(() => section.value?.media?.url);

  const siteName = computed(() => config.public.site?.name || "");

  // Only a section off the menu gets its own rule; otherwise @nuxtjs/robots
  // renders the site rule, which is noindex on the demo shop.
  const robots = computed(() =>
    section.value?.seo.indexable === false ? "noindex,nofollow" : undefined,
  );

  const canonicalUrl = computed(() => seoUrl.value || "");

  const ogImageAlt = computed(() => pageTitle.value);

  useSeoMeta({
    title: pageTitle,
    description: pageDescription,
    ogTitle: fullTitle,
    ogDescription: pageDescription,
    ogUrl: seoUrl,
    ogImage,
    ogType: "website",
    ogSiteName: siteName,
    ogImageAlt,
    twitterTitle: fullTitle,
    twitterDescription: pageDescription,
    twitterImage: ogImage,
    twitterCard: "summary_large_image",
    robots,
  });

  // Add canonical link tag and JSON-LD schema
  useHead({
    link: [
      {
        rel: "canonical",
        key: "canonical",
        href: canonicalUrl.value,
      },
    ],
    script: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: pageTitle.value,
          description: pageDescription.value,
          url: canonicalUrl.value,
          ...(siteName.value
            ? {
                isPartOf: {
                  "@type": "WebSite",
                  name: siteName.value,
                  url: siteConfig.url,
                },
              }
            : {}),
          ...(ogImage.value ? { image: [ogImage.value] } : {}),
        }),
      },
    ],
  });

  return {
    pageTitle,
    fullTitle,
    pageDescription,
    seoUrl,
    ogImage,
    canonicalUrl,
    robots,
    siteName,
  };
}
