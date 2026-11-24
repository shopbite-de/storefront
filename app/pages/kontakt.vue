<script setup lang="ts">
import ContactForm from "~/components/Contact/Form.vue";
const config = useRuntimeConfig();

if (config.public.shopBite.feature.contactForm !== true) {
  throw createNotFoundError();
}

const { t } = useI18n();

useSeoMeta({
  title: t("contact.page.title"),
});

const { site } = config.public;
</script>

<template>
  <div
    class="mx-auto grid w-full max-w-(--sb-container) gap-8 px-4 pt-8 pb-16 font-body text-sb-ink sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16 lg:px-8"
  >
    <header class="flex flex-col gap-4">
      <h1 class="font-display text-4xl leading-tight sm:text-5xl">
        {{ $t("contact.page.title") }}
      </h1>
      <p class="text-lg">
        {{ $t("contact.page.intro") }}
      </p>
      <p class="text-sb-ink-muted">
        {{ $t("contact.page.reservations") }}
      </p>
      <SbButton
        v-if="site.telephone"
        variant="secondary"
        :to="toTelHref(site.telephone)"
        class="self-start"
      >
        <SbIcon name="phone" />
        <span class="sr-only">{{ $t("contact.page.call") }}</span>
        {{ site.telephone }}
      </SbButton>
    </header>
    <div class="rounded-sb-card border border-sb-line bg-sb-surface p-6">
      <ContactForm />
    </div>
  </div>
</template>
