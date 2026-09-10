<script setup lang="ts">
useSeoMeta({
  title: "Merkliste",
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
