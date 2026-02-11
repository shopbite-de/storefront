<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{
  error: NuxtError;
}>();

const {
  public: { site },
} = useRuntimeConfig();

const pageTitle = computed(() => `${statusCode} | ${site?.name}`);

console.error(props.error);

const statusCode = props.error.statusCode;

useSeoMeta({
  title: pageTitle,
});
</script>

<template>
  <NuxtLayout>
    <div class="mb-20 flex flex-col items-center justify-center px-5 py-3">
      <h2 v-if="statusCode === 404" class="text-center">
        Die angeforderte Seite konnte nicht gefunden werden.
      </h2>
      <h2 v-else class="text-center">Irgendwas ist schief gelaufen</h2>
      <h3 class="max-w-lg whitespace-pre-line pb-8 pt-5 text-3xl">
        {{ error.statusCode }}
      </h3>
      <NuxtLink to="/" class="button">Zurück zur Startseite</NuxtLink>
    </div>
  </NuxtLayout>
</template>
