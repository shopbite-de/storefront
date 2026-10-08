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
    <!-- error.vue replaces app.vue, so the error page brings its own
         header and footer -->
    <div>
      <Header />
      <main
        id="inhalt"
        class="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 pt-12 pb-20 font-body text-sb-ink sm:px-6"
      >
        <p class="text-sm font-bold tracking-wide text-sb-accent uppercase">
          Fehler {{ statusCode }}
        </p>
        <h1 class="font-display text-4xl leading-tight sm:text-5xl">
          {{
            statusCode === 404
              ? "Diese Seite gibt es nicht"
              : "Da ist etwas schiefgelaufen"
          }}
        </h1>
        <p class="text-lg">
          {{
            statusCode === 404
              ? "Vielleicht hat sich die Adresse geändert. Unsere Speisekarte finden Sie hier:"
              : "Bitte laden Sie die Seite neu oder versuchen Sie es gleich noch einmal."
          }}
        </p>
        <div class="flex flex-wrap gap-3">
          <SbButton to="/speisekarte/">Zur Speisekarte</SbButton>
          <SbButton variant="secondary" to="/">Zur Startseite</SbButton>
        </div>
      </main>
      <Footer />
    </div>
  </NuxtLayout>
</template>
