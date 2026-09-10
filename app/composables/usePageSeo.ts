import type { MaybeRefOrGetter } from "vue";
import { formatPageTitle, toAbsoluteUrl } from "../utils/seo";

type PageSeo = {
  title: MaybeRefOrGetter<string | undefined>;
  description?: MaybeRefOrGetter<string | undefined>;
  /** Site-relative path or absolute URL; falls back to `site.ogImage`. */
  image?: MaybeRefOrGetter<string | undefined>;
  /** Render the title without the site title template (home page). */
  standalone?: boolean;
};

/**
 * Title, description and share preview of an indexable page. Canonical,
 * og:url and the fallback og:image are set globally in app.vue.
 */
export function usePageSeo({
  title,
  description,
  image,
  standalone = false,
}: PageSeo) {
  const { site } = useRuntimeConfig().public;
  const siteConfig = useSiteConfig();

  const fullTitle = computed(() =>
    standalone
      ? (toValue(title) ?? site.name)
      : formatPageTitle(toValue(title), site.name, site.titleTemplate),
  );

  const imageUrl = computed(() => {
    const path = toValue(image);
    return path ? toAbsoluteUrl(siteConfig.url, path) : undefined;
  });

  useSeoMeta({
    title,
    titleTemplate: standalone ? "%s" : undefined,
    ogTitle: fullTitle,
    twitterTitle: fullTitle,
    description,
    ogDescription: description,
    twitterDescription: description,
    ogImage: imageUrl,
    twitterImage: imageUrl,
  });

  return { fullTitle, imageUrl };
}
