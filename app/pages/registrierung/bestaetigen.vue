<script setup lang="ts">
const route = useRoute();
const toast = useToast();

const { apiClient } = useShopwareContext();

const emParameter = computed(() => route.query.em as string | undefined);
const hashParameter = computed(() => route.query.hash as string | undefined);

const { mergeWishlistProducts } = useWishlist();

await useAsyncData("register-confirm", async () => {
  try {
    if (!emParameter.value || !hashParameter.value) {
      throw new Error("Missing required parameters");
    }

    return await apiClient.invoke(
      "registerConfirm post /account/register-confirm",
      {
        body: {
          em: emParameter.value,
          hash: hashParameter.value,
        },
      },
    );
  } catch (e) {
    console.error("Registration confirmation failed:", e);
    return null;
  }
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
