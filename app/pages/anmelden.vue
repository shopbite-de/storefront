<script setup lang="ts">
const { isLoggedIn } = useUser();

onMounted(() => {
  if (isLoggedIn.value) {
    navigateTo("/konto");
  }
});

watch(isLoggedIn, (newValue) => {
  if (newValue) {
    navigateTo("/konto");
  }
});

function handleLoginSuccess() {
  navigateTo("/speisekarte");
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
