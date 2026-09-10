<script setup lang="ts">
useSeoMeta({
  title: "Zahlung erfolgreich",
  robots: "noindex, nofollow",
});

const route = useRoute();
const orderId = route.params.id as string;

const { refreshCart } = useCart();

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
