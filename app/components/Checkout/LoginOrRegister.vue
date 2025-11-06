<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

const { refreshUser } = useUser();
const items = [
  {
    label: "Daten erfassen",
    slot: "register" as const,
  },
  {
    label: "Einloggen",
    slot: "login" as const,
  },
] satisfies TabsItem[];

const toast = useToast();

const { mergeWishlistProducts } = useWishlist();

async function handleLoginSuccess() {
  await refreshUser();
  mergeWishlistProducts();
  toast.add({
    title: "Wilkommen!",
    color: "success",
    progress: false,
  });
}
</script>

<template>
  <div>
    <UTabs :items="items" :ui="{ trigger: 'grow' }" class="gap-4 w-full">
      <template #register>
        <UserRegistrationForm @registration-success="handleLoginSuccess" />
      </template>

      <template #login>
        <UserLoginForm />
      </template>
    </UTabs>
  </div>
</template>
