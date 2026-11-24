<script setup lang="ts">
import { shopLocale } from "#shopbite-locale";
import type { NuxtError } from "#app";

const props = defineProps<{
  error: NuxtError;
}>();

const {
  public: { site },
} = useRuntimeConfig();

const pageTitle = computed(() => `${statusCode} | ${site?.name}`);

console.error(props.error);

// error.vue replaces app.vue: load the switch that accepts orders, hours,
// holidays and lead times live after hydration here as well
// (useLiveShopData).
useLiveShopData();

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
          {{ $t("common.error.kicker", { status: statusCode }) }}
        </p>
        <h1 class="font-display text-4xl leading-tight sm:text-5xl">
          {{
            statusCode === 404
              ? $t("common.error.notFoundTitle")
              : $t("common.error.failedTitle")
          }}
        </h1>
        <p class="text-lg">
          {{
            statusCode === 404
              ? $t("common.error.notFoundText")
              : $t("common.error.failedText")
          }}
        </p>
        <div class="flex flex-wrap gap-3">
          <SbButton :to="shopLocale.menuPath">{{
            $t("common.shared.toMenu")
          }}</SbButton>
          <SbButton variant="secondary" to="/">{{
            $t("common.shared.toHome")
          }}</SbButton>
        </div>
      </main>
      <Footer />
    </div>
  </NuxtLayout>
</template>
