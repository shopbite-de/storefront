<script setup lang="ts">
import { useUser } from "@shopware/composables";

const { mainMenu } = useNavigation(false);
const multiChannelEnabled =
  useRuntimeConfig().public.shopBite.feature.multiChannel;

const { isLoggedIn, isGuestSession, logout } = useUser();
const toast = useToast();

const logoutHandler = () => {
  logout();
  toast.add({
    title: "Tschüss!",
    description: "Erfolgreich abgemeldet.",
    color: "success",
  });
};
</script>

<template>
  <UNavigationMenu
    color="primary"
    :items="mainMenu"
    orientation="vertical"
    class="-mx-2.5"
  />

  <USeparator class="my-4" />

  <div class="flex flex-col gap-1">
    <template v-if="isLoggedIn || isGuestSession">
      <UButton
        color="neutral"
        variant="ghost"
        to="/konto"
        icon="i-lucide-user"
        label="Mein Konto"
        class="justify-start"
      />
      <UButton
        color="neutral"
        variant="ghost"
        to="/konto/bestellungen"
        icon="i-lucide-pizza"
        label="Bestellungen"
        class="justify-start"
      />
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-log-out"
        label="Abmelden"
        class="justify-start"
        @click="logoutHandler"
      />
    </template>
    <template v-else>
      <UButton
        color="neutral"
        variant="ghost"
        to="/anmelden"
        icon="i-lucide-user"
        label="Anmelden"
        class="justify-start"
      />
      <UButton
        color="neutral"
        variant="ghost"
        to="/registrierung"
        icon="i-lucide-user-plus"
        label="Registrieren"
        class="justify-start"
      />
    </template>
  </div>

  <div v-if="multiChannelEnabled" class="mt-4">
    <USeparator class="mb-4" />
    <SalesChannelSwitch />
  </div>
</template>
