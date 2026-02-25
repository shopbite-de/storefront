<script setup lang="ts">
import ContactForm from "~/components/Contact/Form.vue";
const config = useRuntimeConfig();

if (config.public.shopBite.feature.contactForm !== true) {
  throw createError({
    statusCode: 404,
    statusMessage: "Page not found",
    fatal: true,
  });
}
</script>

<template>
  <UPageSection
    title="Sie haben eine Frage oder Anregung?Wir freuen uns auf Ihre Nachricht."
    description="Bitte beachten Sie, dass wir Tischreservierung oder Tischstornierung nur telefonisch entgegennehmen können."
    icon="i-lucide-mail"
    orientation="horizontal"
  >
    <ContactForm />
  </UPageSection>
</template>
