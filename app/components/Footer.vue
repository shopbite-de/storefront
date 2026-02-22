<script setup lang="ts">
import { useNavigation } from "~/composables/useNavigation";
import type {
  FooterColumn,
  FooterColumnLink,
  NavigationMenuItem,
} from "@nuxt/ui";

const { footerMenu } = useNavigation();

const menuItemToFooterColumnLink = (
  item: NavigationMenuItem,
): FooterColumnLink => ({
  label: item.label ?? "",
  to: item.to as string | undefined,
  target: item.target as string | undefined,
  icon: item.icon,
});

const menuItemsToFooterColumns = (
  items: NavigationMenuItem[],
): FooterColumn[] =>
  items.map((item) => ({
    label: item.label ?? "",
    children: item.children?.map(menuItemToFooterColumnLink) ?? [],
  }));

const footerColumns = computed<FooterColumn[]>(() =>
  menuItemsToFooterColumns(footerMenu.value),
);
</script>

<template>
  <USeparator class="h-px" />

  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #top>
      <UContainer>
        <UFooterColumns :columns="footerColumns" />
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
