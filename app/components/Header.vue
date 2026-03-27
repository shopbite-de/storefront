<script setup lang="ts">
const { mainMenu } = useNavigation(false);
const loginSlide = ref(false);
</script>

<template>
  <UHeader>
    <template #title>
      <HeaderTitle />
    </template>

    <UNavigationMenu color="primary" variant="pill" :items="mainMenu" />
    <SalesChannelSwitch />

    <template #right>
      <HeaderRight />
    </template>

    <template #body>
      <LazyHeaderBody />
    </template>
  </UHeader>

  <USlideover
    v-model:open="loginSlide"
    title="Konto"
    description="Alle Vorteile eines Kontos genießen"
  >
    <template #body>
      <div class="h-full m-4">
        <LazyUserLoginForm />
      </div>
    </template>
  </USlideover>
</template>
