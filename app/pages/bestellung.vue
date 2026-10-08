<script setup lang="ts">
// Frame of the order pages: the one-page checkout (/bestellung/kasse, #443)
// and the order and payment result pages. The old step routes redirect to
// the checkout (routeRules in nuxt.config.ts).
</script>

<template>
  <div
    class="mx-auto w-full max-w-(--sb-container) px-4 pt-8 pb-16 sm:px-6 sm:pt-12 lg:px-8"
  >
    <NuxtPage />
  </div>
</template>
