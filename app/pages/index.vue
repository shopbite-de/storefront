<script setup lang="ts">
// Server route instead of queryCollection(): keeps the SQLite WASM client
// out of client-side navigations (#314).
const { data: page } = await useAsyncData("index", () =>
  $fetch("/api/content/home"),
);
if (!page.value) {
  throw createNotFoundError();
}

const { site } = useRuntimeConfig().public;
const homeSite = {
  name: site.name,
  city: site.address.city,
  cuisine: site.cuisine,
};

// Nuxt Content fills seo.title/description from title/description, so only
// values that differ from those were set explicitly for search engines.
const { seo, title, description } = page.value;
const customTitle = seo?.title !== title ? seo?.title : undefined;
const customDescription =
  seo?.description !== description ? seo?.description : undefined;

usePageSeo({
  title: customTitle || buildHomeTitle(homeSite),
  description:
    customDescription || buildHomeDescription(homeSite) || description,
  image: seo?.image as string | undefined,
  standalone: true,
});

useRestaurantSchema();

// Shops with a style preset get the home page of #444.
</script>
<template>
  <div v-if="page">
    <HomeHero
      :title="page.hero.title || page.title"
      :description="page.description"
      :headline="page.hero.headline"
      :image="page.hero.image || page.hero.poster"
      :image-position="page.hero.imagePosition"
      :links="page.hero.links"
      :usps="page.hero.usps"
    />
    <HomeFacts
      v-if="page.features?.features?.length"
      :features="page.features.features"
    />
    <HomeCategories :title="page.menu?.title" />
    <HomeHighlights :title="page.highlights?.title" />
    <HomeRestaurant
      v-if="page.gallery"
      :title="page.gallery.title"
      :description="page.gallery.description"
      :headline="page.gallery.headline"
      :image="page.gallery.images?.[0]?.image"
      :links="page.gallery.links"
    />
    <HomeFaq
      v-if="page.faq?.items?.length"
      :title="page.faq.title"
      :description="page.faq.description"
      :headline="page.faq.headline"
      :items="page.faq.items"
    />
  </div>
</template>
