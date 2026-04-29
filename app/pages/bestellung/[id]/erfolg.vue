<script setup lang="ts">
const {
  public: { site },
} = useRuntimeConfig();

useSeoMeta({
  title: `Zahlung erfolgreich | ${site.name}`,
  robots: "noindex, nofollow",
});

const route = useRoute();
const orderId = route.params.id as string;

const { refreshCart } = useCommerceCart();

onMounted(async () => {
  await refreshCart();
});

const links = [
  {
    label: "Zur Bestellung",
    to: `/bestellung/${orderId}`,
    icon: "i-lucide-receipt",
    size: "xl" as const,
  },
];
</script>

<template>
  <UPageSection
    icon="i-lucide-circle-check"
    title="Bestellung erfolgreich erstellt!"
    description="Wir bereiten deine Bestellung jetzt vor."
    :links="links"
  />
</template>
