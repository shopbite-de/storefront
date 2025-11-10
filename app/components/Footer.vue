<script setup lang="ts">
const columns = [
  {
    label: "Informationen",
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
  {
    label: "Unternehmen",
    children: [
      {
        label: "Tel: 06104 71427",
      },
      {
        label: "Kantstraße 6",
      },
      {
        label: "631679 Oberthsuasen",
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
