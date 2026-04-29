<script setup lang="ts">
const route = useRoute();
const toast = useToast();
const { mergeWishlistProducts } = useCommerceWishlist();

const em = route.query.em as string | undefined;
const hash = route.query.hash as string | undefined;

await useAsyncData("register-confirm", async () => {
  if (!em || !hash) {
    throw new Error("Missing required parameters");
  }

  await $fetch("/api/auth/register-confirm", {
    method: "POST",
    body: { em, hash },
  });
});

mergeWishlistProducts();
toast.add({
  title: "Bestätigung erfolgreich!",
  description: "Jetzt anmelden und los legen.",
  color: "success",
});
navigateTo({ path: "/konto" });
</script>

<template>
  <UContainer> Etwas ist schief gelaufen </UContainer>
</template>
