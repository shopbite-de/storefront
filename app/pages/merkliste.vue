<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({
  title: t("menu.wishlistPage.title"),
});
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
    <h1
      class="mb-6 font-display text-4xl leading-tight text-sb-ink sm:text-5xl"
    >
      {{ $t("menu.wishlistPage.title") }}
    </h1>
    <Wishlist :show-menu-button="true" />
  </div>
</template>
