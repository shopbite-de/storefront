<script setup lang="ts">
import { useNavigation } from "~/composables/useNavigation";

const config = useRuntimeConfig();

const multiChannelEnabled = computed(
  () => config.public.shopBite.feature.multiChannel === "true",
);

console.log(multiChannelEnabled.value);
const { mainMenu } = useNavigation();
</script>

<template>
  <UNavigationMenu
    color="primary"
    :items="mainMenu"
    orientation="vertical"
    class="-mx-2.5"
  />
  <div v-if="multiChannelEnabled" class="my-4">
    <SalesChannelSwitch />
  </div>
</template>
