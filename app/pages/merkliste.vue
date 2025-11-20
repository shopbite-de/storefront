<script setup lang="ts">
const {
  public: { site },
} = useRuntimeConfig();

const pageTitle = computed(() => `Merkliste | ${site?.name}`);

useSeoMeta({
  title: pageTitle,
});
</script>

<template>
  <UContainer>
    <UPageSection
      title="Merkliste"
      description="Verwalte deine Lieblingsprodukte."
      icon="i-lucide-heart"
    >
      <Wishlist :show-menu-button="true" :use-grid-layout="true" />
    </UPageSection>
  </UContainer>
</template>
