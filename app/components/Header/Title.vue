<script setup lang="ts">
const config = useRuntimeConfig();
const siteName = computed(() => config.public.site.name);
</script>

<template>
  <NuxtLink to="/" class="-m-1.5 p-1.5">
    <span class="sr-only">{{ siteName }}</span>
    <UColorModeImage
      alt="Logo"
      light="/light/Logo.png"
      dark="/dark/Logo.png"
      class="h-12 w-auto"
    />
  </NuxtLink>
</template>
