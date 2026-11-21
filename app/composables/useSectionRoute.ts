import type { ResolvedRoute } from "../../shared/domain";

/**
 * Resolves the current route to a menu section through the BFF
 * (`/api/resolve-path`, ADR 0001 step 3). Throws a 404 when no section has
 * the path and redirects (301) to the section's canonical path when the
 * visited path is only another spelling of it: missing or extra trailing
 * slash (#291), different casing (#244) or a former path of a renamed
 * section. Dish links without the sheet (#289) and the storefront's
 * content pages are no sections. The query (`?produkt=` of a dish link)
 * is kept.
 */
export async function useSectionRoute() {
  const route = useRoute();
  const routePath = route.path;

  const { data, error } = await useAsyncData(
    `section-route${routePath}`,
    async () => {
      const { route: resolved } = await $fetch<{
        route: ResolvedRoute | null;
      }>("/api/resolve-path", { query: { path: routePath } });

      if (!resolved) {
        throw createError({
          statusCode: 404,
          statusMessage: `No data fetched from API for ${routePath}`,
        });
      }
      return resolved;
    },
  );

  if (error.value) {
    throw error.value;
  }

  if (data.value?.kind === "redirect") {
    await navigateTo(
      { path: data.value.to, query: route.query },
      { redirectCode: 301, replace: true },
    );
  }

  return {
    sectionId: computed(() => data.value?.sectionId),
  };
}
