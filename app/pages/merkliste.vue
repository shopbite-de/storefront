<script setup lang="ts">
useSeoMeta({
  title: "Merkliste",
});
const { hasPreset } = useThemePreset();
</script>

<template>
  <div
    v-if="hasPreset"
    class="mx-auto w-full max-w-3xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12"
  >
    <h1
      class="mb-6 font-display text-4xl leading-tight text-sb-ink sm:text-5xl"
    >
      Merkliste
    </h1>
    <Wishlist :show-menu-button="true" />
  </div>
  <UContainer v-else>
    <UPageSection
      title="Merkliste"
      description="Verwalte deine Lieblingsprodukte."
      icon="i-lucide-heart"
    >
      <Wishlist :show-menu-button="true" :use-grid-layout="true" />
    </UPageSection>
  </UContainer>
</template>
