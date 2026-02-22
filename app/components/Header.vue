<script setup lang="ts">
import { useNavigation } from "~/composables/useNavigation";

const { mainMenu } = useNavigation(false);

const loginSlide = ref(false);
</script>

<template>
  <UHeader>
    <template #title>
      <HeaderTitle />
    </template>

    <UNavigationMenu color="primary" variant="pill" :items="mainMenu" />

    <template #right>
      <HeaderRight />
    </template>

    <template #body>
      <HeaderBody />
    </template>
  </UHeader>

  <USlideover
    v-model:open="loginSlide"
    title="Konto"
    description="Alle Vorteile eines Kontos genießen"
  >
    <template #body>
      <div class="h-full m-4">
        <UserLoginForm />
      </div>
    </template>
  </USlideover>
</template>
