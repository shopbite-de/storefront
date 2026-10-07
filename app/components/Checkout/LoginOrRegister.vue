<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";

// Presets: Reka tabs with the base forms (#443).
const { hasPreset } = useThemePreset();
const presetTab = ref<"neu" | "kunde">("neu");

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
  mergeWishlistProducts();
  toast.add({
    title: "Wilkommen!",
    color: "success",
    progress: false,
  });
}
</script>

<template>
  <TabsRoot v-if="hasPreset" v-model="presetTab" class="flex flex-col gap-5">
    <TabsList
      aria-label="Kundendaten"
      class="grid grid-cols-2 gap-1 rounded-sb-control bg-sb-muted p-1 font-body"
    >
      <TabsTrigger
        value="neu"
        class="min-h-11 rounded-[calc(var(--sb-radius-control)-3px)] px-3 text-sm font-semibold text-sb-ink-muted focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sb-focus data-[state=active]:bg-sb-ink data-[state=active]:font-bold data-[state=active]:text-sb-surface"
      >
        Neu hier oder als Gast
      </TabsTrigger>
      <TabsTrigger
        value="kunde"
        class="min-h-11 rounded-[calc(var(--sb-radius-control)-3px)] px-3 text-sm font-semibold text-sb-ink-muted focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sb-focus data-[state=active]:bg-sb-ink data-[state=active]:font-bold data-[state=active]:text-sb-surface"
      >
        Schon Kunde
      </TabsTrigger>
    </TabsList>
    <TabsContent value="neu" class="focus-visible:outline-none">
      <UserRegistrationFormPreset @registration-success="handleLoginSuccess" />
    </TabsContent>
    <TabsContent value="kunde" class="focus-visible:outline-none">
      <UserLoginFormPreset @login-success="handleLoginSuccess" />
    </TabsContent>
  </TabsRoot>
  <div v-else>
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
