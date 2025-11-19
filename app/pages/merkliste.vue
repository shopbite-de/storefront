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
    <Wishlist :show-menu-button="true" />
  </UContainer>
</template>
