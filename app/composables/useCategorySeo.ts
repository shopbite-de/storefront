import type { Schemas } from "#shopware";
import { formatPageTitle, toAbsoluteUrl } from "../utils/seo";

export function useCategorySeo(category: Ref<Schemas["Category"] | undefined>) {
  const config = useRuntimeConfig();
  const siteConfig = useSiteConfig();
  const storeName = config.public.site?.name || "";

  const pageTitle = computed(
    () =>
      category.value?.translated?.metaTitle ??
      category.value?.metaTitle ??
      category.value?.translated?.name ??
      category.value?.name,
  );

  // <title> gets the template via app.vue; og/twitter titles need it spelled out.
  const fullTitle = computed(() =>
    formatPageTitle(
      pageTitle.value,
      storeName,
      config.public.site?.titleTemplate ?? "",
    ),
  );

  const pageDescription = computed(
    () =>
      category.value?.translated?.metaDescription ??
      category.value?.metaDescription ??
      category.value?.translated?.description ??
      category.value?.description,
  );

  const seoUrl = computed(() =>
    toAbsoluteUrl(siteConfig.url, category.value?.seoUrl || ""),
  );

  const ogImage = computed(() => category.value?.media?.url);

  const siteName = computed(() => config.public.site?.name || "");

  const robots = computed(() => {
    const active = category.value?.active;
    return active === false ? "noindex,nofollow" : "index,follow";
  });

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
