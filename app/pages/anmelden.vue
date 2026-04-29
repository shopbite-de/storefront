<script setup lang="ts">
const { isLoggedIn } = useCommerceUser();
const { mergeWishlistProducts } = useCommerceWishlist();

onBeforeMount(async () => {
  if (import.meta.client && isLoggedIn.value) {
    navigateTo({ path: "/konto" });
  }
});

watch(isLoggedIn, (newValue) => {
  if (newValue) {
    navigateTo({ path: "/konto" });
  }
});

function handleLoginSuccess() {
  mergeWishlistProducts();
  navigateTo("/");
}
</script>

<template>
  <UContainer>
    <div class="max-w-xl mx-auto mt-16">
      <UserLoginForm
        title="Anmelden"
        icon="i-lucide-user"
        with-register-hint
        @login-success="handleLoginSuccess"
      />
    </div>
  </UContainer>
</template>
