<script setup lang="ts">
const { mainMenu } = useNavigation(false);
// The logo link's accessible name; Nuxt UI's default is "Nuxt UI" (#275).
const { site, shopBite } = useRuntimeConfig().public;
</script>

<template>
  <UHeader :title="site.name">
    <template #title>
      <HeaderTitle />
    </template>

    <UNavigationMenu color="primary" variant="pill" :items="mainMenu" />
    <!-- Lazy keeps USelectMenu out of the entry chunk of single-channel shops (#314). -->
    <LazySalesChannelSwitch v-if="shopBite.feature.multiChannel" />

    <template #right>
      <HeaderRight />
    </template>

    <template #body>
      <LazyHeaderBody />
    </template>
  </UHeader>
</template>
