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
const { hasPreset } = useThemePreset();
</script>
<template>
  <div v-if="page && hasPreset">
    <HomePresetHero
      :title="page.hero.title || page.title"
      :description="page.description"
      :headline="page.hero.headline"
      :poster="page.hero.poster"
      :links="page.hero.links"
      :usps="page.hero.usps"
    />
    <HomePresetFacts
      v-if="page.features?.features?.length"
      :features="page.features.features"
    />
    <HomePresetCategories :title="page.menu?.title" />
    <HomePresetHighlights :title="page.highlights?.title" />
    <HomePresetRestaurant
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
  <div v-else-if="page" class="relative">
    <Hero
      :title="page.hero.title || page.title"
      :background-video="page.hero.backgroundVideo"
      :poster="page.hero.poster"
      :description="page.description"
      :headline="page.hero.headline"
      :links="page.hero.links"
      :usps="page.hero.usps"
    />

    <HomeMenuCategories
      :title="page.menu?.title"
      :description="page.menu?.description"
      :headline="page.menu?.headline"
    />

    <HomeHighlights
      :title="page.highlights?.title"
      :description="page.highlights?.description"
      :headline="page.highlights?.headline"
    />

    <USeparator :ui="{ border: 'border-primary/30' }" />

    <Features
      :title="page.features.title"
      :description="page.features.description"
      :headline="page.features.headline"
      :features="page.features.features"
    />

    <UPageSection
      v-if="page.mittagstisch"
      :reverse="page.mittagstisch.reverse"
      :headline="page.mittagstisch.headline"
      :title="page.mittagstisch.title"
      :description="page.mittagstisch.description"
      :orientation="page.mittagstisch.orientation"
      :features="page.mittagstisch.features"
      :links="page.mittagstisch.links"
    >
      <img
        :src="page.mittagstisch.image"
        width="352"
        height="647"
        :alt="page.mittagstisch.imageAlt"
        class="w-full rounded-lg"
      />
    </UPageSection>

    <ImageGallery
      v-if="page.gallery?.images?.length"
      :title="page.gallery.title"
      :description="page.gallery.description"
      :headline="page.gallery.headline"
      :images="page.gallery.images"
      :links="page.gallery.links"
    />
    <HomeFaq
      v-if="page.faq?.items?.length"
      :title="page.faq.title"
      :description="page.faq.description"
      :headline="page.faq.headline"
      :items="page.faq.items"
    />
    <Cta
      :title="page.cta.title"
      :description="page.cta.description"
      :background-image="page.cta.backgroundImage"
      :links="page.cta.links"
    />
  </div>
</template>
