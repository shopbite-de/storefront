<script setup lang="ts">
// Notice for demo shops (demos/): rendered above the header when
// `shopBite.feature.demoBanner` is set. Not dismissible on purpose, so a
// prospect never mistakes the demo for a live shop.
</script>

<template>
  <div
    class="bg-sb-ink px-4 py-2.5 text-center font-body text-sm font-semibold text-sb-bg"
  >
    {{ $t("common.demoBanner.text") }}
  </div>
</template>
