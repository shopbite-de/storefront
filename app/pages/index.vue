<script setup lang="ts">
const { data: page } = await useAsyncData("index", () =>
  queryCollection("home").first(),
);
if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Page not found",
    fatal: true,
  });
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
</script>
<template>
  <div v-if="page" class="relative">
    <Hero
      :title="page.title"
      :background-video="page.hero.backgroundVideo"
      :poster="page.hero.poster"
      :description="page.description"
      :headline="page.hero.headline"
      :links="page.hero.links"
      :usps="page.hero.usps"
    />

    <USeparator :ui="{ border: 'border-primary/30' }" />

    <Features
      :title="page.features.title"
      :description="page.features.description"
      :headline="page.features.headline"
      :features="page.features.features"
    />

    <USeparator :ui="{ border: 'border-primary/30' }" />

    <LazyFoodMarquee
      v-if="page.marquee.items?.length > 0"
      :title="page.marquee.title"
      :description="page.marquee.description"
      :headline="page.marquee.headline"
      :items="page.marquee.items"
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
      :title="page.gallery.title"
      :description="page.gallery.description"
      :headline="page.gallery.headline"
      :images="page.gallery.images"
      :links="page.gallery.links"
    />
    <Cta
      :title="page.cta.title"
      :description="page.cta.description"
      :background-image="page.cta.backgroundImage"
      :links="page.cta.links"
    />
  </div>
</template>
