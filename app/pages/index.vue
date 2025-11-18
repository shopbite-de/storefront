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

useSeoMeta({
  title: page.value.seo?.title || page.value.title,
  ogTitle: page.value.seo?.title || page.value.title,
  description: page.value.seo?.description || page.value.description,
  ogDescription: page.value.seo?.description || page.value.description,
});
</script>
<template>
  <div v-if="page" class="relative">
    <Hero
      :title="page.title"
      :background-video="page.hero.backgroundVideo"
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

    <FoodMarquee
      v-if="page.marquee.items?.length > 0"
      :title="page.marquee.title"
      :description="page.marquee.description"
      :headline="page.marquee.headline"
      :items="page.marquee.items"
    />

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
