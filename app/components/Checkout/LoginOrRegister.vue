<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";

// Reka tabs with the base forms (#443).
const presetTab = ref<"neu" | "kunde">("neu");
</script>

<template>
  <TabsRoot v-model="presetTab" class="flex flex-col gap-5">
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
      <UserRegistrationForm />
    </TabsContent>
    <TabsContent value="kunde" class="focus-visible:outline-none">
      <UserLoginForm />
    </TabsContent>
  </TabsRoot>
</template>
