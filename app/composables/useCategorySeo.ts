import type { Schemas } from "#shopware";

export function useCategorySeo(category: Ref<Schemas["Category"] | undefined>) {
  const config = useRuntimeConfig();
  const storeName = config.public.site?.name || "";

  const pageTitle = computed(() => {
    const categoryName =
      category.value?.translated?.metaTitle ??
      category.value?.metaTitle ??
      category.value?.translated?.name ??
      category.value?.name;

    return categoryName + " | Speisekarte | " + storeName;
  });

  const pageDescription = computed(
    () =>
      category.value?.translated?.metaDescription ??
      category.value?.metaDescription ??
      category.value?.translated?.description ??
      category.value?.description,
  );

  const seoUrl = computed(() => {
    const base = config.public.storeUrl || "";
    const path = category.value?.seoUrl || "";
    return base + path;
  });

  const breadcrumb = computed<string[]>(
    () =>
      category.value?.translated.breadcrumb ?? category.value?.breadcrumb ?? [],
  );

  // Build BreadcrumbList items from category breadcrumb
  type BreadcrumbListItem = {
    "@type": "ListItem";
    position: number;
    name: string;
    item?: string;
  };
  const breadcrumbItems = computed(() => {
    const names = (breadcrumb.value || []) as string[];
    const items: BreadcrumbListItem[] = [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: config.public.storeUrl || "/",
      },
    ];

    if (names.length > 0) {
      names.forEach((name: string, idx: number) => {
        const isLast = idx === names.length - 1;
        items.push({
          "@type": "ListItem",
          position: idx + 2,
          name,
          ...(isLast && canonicalUrl.value ? { item: canonicalUrl.value } : {}),
        });
      });
    } else if (pageTitle.value) {
      items.push({
        "@type": "ListItem",
        position: 2,
        name: pageTitle.value,
        ...(canonicalUrl.value ? { item: canonicalUrl.value } : {}),
      });
    }

    return items;
  });

  const ogImage = computed(() => category.value?.media?.url);

  const siteName = computed(() => config.public.site?.name || "");
  const locale = computed(() => {
    try {
      const lang = import.meta.client
        ? document?.documentElement?.lang
        : undefined;
      return (lang || "de").replace("_", "-");
    } catch {
      return "de";
    }
  });

  const keywords = computed(
    () =>
      category.value?.translated?.keywords ||
      category.value?.keywords ||
      undefined,
  );

  const robots = computed(() => {
    const active = category.value?.active;
    return active === false ? "noindex,nofollow" : "index,follow";
  });

  const canonicalUrl = computed(() => seoUrl.value || "");

  const ogImageAlt = computed(() => pageTitle.value);

  useSeoMeta({
    title: pageTitle,
    description: pageDescription,
    ogTitle: pageTitle,
    ogDescription: pageDescription,
    ogUrl: seoUrl,
    ogImage,
    ogType: "website",
    ogSiteName: siteName,
    ogLocale: locale,
    ogImageAlt,
    twitterTitle: pageTitle,
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
                  url: config.public.storeUrl || "",
                },
              }
            : {}),
          ...(ogImage.value ? { image: [ogImage.value] } : {}),
        }),
      },
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbItems.value,
        }),
      },
    ],
  });

  return {
    pageTitle,
    pageDescription,
    seoUrl,
    ogImage,
    canonicalUrl,
    keywords,
    robots,
    siteName,
    locale,
  };
}
