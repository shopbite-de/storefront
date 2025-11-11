<script setup lang="ts">
// Fetch navigation from content
const { data: navigationData } = await useAsyncData("footer-navigation", () =>
  queryCollection("navigation").first(),
);

const columns = computed(() => {
  if (!navigationData.value?.footer.columns) return [];
  return navigationData.value.footer.columns;
});
</script>

<template>
  <USeparator class="h-px" />

  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #top>
      <UContainer>
        <UFooterColumns :columns="columns" />
      </UContainer>
    </template>

    <template #left>
      <NuxtLink
        to="https://shopbite.de"
        class="text-sm text-muted"
        target="_blank"
      >
        Bestellsystm von ShopBite • © {{ new Date().getFullYear() }}
      </NuxtLink>
    </template>

    <p class="text-muted text-sm">
      Alle Preise inkl. gesetzlicher Mehrwertsteuer zzgl. Versandkosten, wenn
      nicht anders beschrieben
    </p>

    <template #right>
      <UColorModeButton />

      <UButton
        to="https://github.com/shopbite-de/storefront"
        target="_blank"
        icon="i-simple-icons-github"
        aria-label="ShopBite on GitHub"
        color="neutral"
        variant="ghost"
      />
    </template>
  </UFooter>
</template>
