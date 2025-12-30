<script setup lang="ts">
const { count } = useWishlist();
const { refresh } = useShopBiteConfig();

onMounted(() => {
  refresh();
});
</script>

<template>
  <div>
    <UContainer>
      <UPage>
        <template #left>
          <UPageAside>
            <NavigationDesktopLeft />
          </UPageAside>
        </template>

        <UPageBody>
          <slot />
        </UPageBody>

        <template #right>
          <UPageAside>
            <Wishlist v-if="count > 0" />
          </UPageAside>
        </template>
      </UPage>
    </UContainer>
  </div>
</template>
