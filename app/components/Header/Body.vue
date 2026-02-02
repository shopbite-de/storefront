<script setup lang="ts">
const { navi } = await useHeaderNavigation();
</script>

<template>
  <UNavigationMenu
    color="primary"
    :items="navi"
    orientation="vertical"
    class="-mx-2.5"
  />
  <div class="my-4">
    <SalesChannelSwitch />
  </div>
</template>
