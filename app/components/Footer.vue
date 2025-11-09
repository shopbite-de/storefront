<script setup lang="ts">
const columns = [
  {
    label: "Unternehmen",
    children: [
      {
        label: "Impressum",
        to: "/impressum",
      },
      {
        label: "Datenschutz",
        to: "/datenschutz",
      },
      {
        label: "AGB",
        to: "/agb",
      },
    ],
  },
  {
    label: "Top Kategorien",
    children: [
      {
        label: "Pizza",
        to: "/c/Pizza/",
      },
      {
        label: "Nudeln",
        to: "/c/Nudeln/",
      },
      {
        label: "Fleischgerichte",
        to: "/c/Fleischgerichte/",
      },
    ],
  },
];
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
      <p class="text-sm text-muted">
        Built with ShopBite • © {{ new Date().getFullYear() }}
      </p>
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
