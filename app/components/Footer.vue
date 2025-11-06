<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const navi = computed<NavigationMenuItem[]>(() => [
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
]);
</script>

<template>
  <UFooter>
    <template #left>
      <p class="text-muted text-sm">
        Copyright © {{ new Date().getFullYear() }}
      </p>
    </template>

    <UNavigationMenu :items="navi" variant="link" />

    <template #right>
      <UColorModeSwitch />

      <UButton
        icon="i-simple-icons-facebook"
        color="neutral"
        variant="ghost"
        to="https://www.facebook.com/p/La-Fattoria-Alte-Schmiede-100050881732859/?locale=de_DE"
        target="_blank"
        aria-label="Discord"
      />
    </template>
  </UFooter>
</template>
