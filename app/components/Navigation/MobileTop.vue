<script setup lang="ts">
import { useNavigation } from "~/composables/useNavigation";

const { menuCardMenu } = useNavigation(true);
</script>

<template>
  <UNavigationMenu
    class="lg:hidden"
    orientation="horizontal"
    :items="menuCardMenu"
    :ui="{
      list: 'overflow-x-auto',
      item: 'flex-shrink-0',
    }"
  >
    <template #list-leading>
      <UIcon name="i-lucide-chevron-left" class="size-8" />
    </template>
    <template #list-trailing>
      <UIcon name="i-lucide-chevron-right" class="size-8" />
    </template>
  </UNavigationMenu>
</template>
