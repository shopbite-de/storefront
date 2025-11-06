<script setup lang="ts">
import LoginOrRegister from "~/components/Checkout/LoginOrRegister.vue";
import type { StepperItem } from "@nuxt/ui";

const { isLoggedIn, isGuestSession } = useUser();
const { isEmpty } = useCart();

const items = [
  {
    slot: "user" as const,
    title: "Deine Daten",
    icon: "i-lucide-user",
  },
  {
    slot: "shipping" as const,
    title: "Zahlung & Versand",
    icon: "i-lucide-truck",
  },
  {
    slot: "checkout" as const,
    title: "Prüfen & Bestellen",
    icon: "i-lucide-check",
  },
] satisfies StepperItem[];

const activeStep = ref(0);

const isCustomerAvailable = computed<boolean>(() => {
  return isLoggedIn.value || isGuestSession.value;
});
</script>

<template>
  <UContainer>
    <UPageHeader title="Bestellung aufgeben" />
    <UPageBody>
      <UStepper v-model="activeStep" :items="items">
        <template #user>
          <div class="flex flex-col md:flex-row w-full gap-18 my-16">
            <LoginOrRegister
              v-if="!isLoggedIn && !isGuestSession"
              class="basis-1/2"
            />
            <div v-else class="basis-1/2">
              <UserDetail />
              <UButton
                label="Daten überarbeiten"
                variant="subtle"
                block
                icon="i-lucide-pen"
                class="my-4"
                to="/konto"
              />
            </div>
            <div class="basis-1/2">
              <h3 class="text-2xl mb-6 font-semibold">Warenkorb</h3>
              <CartQuickView />
              <UButton
                v-if="!isEmpty && isCustomerAvailable"
                :disabled="!isLoggedIn && !isGuestSession"
                label="Zahlungs- und Versandart auswählen"
                size="xl"
                block
                trailing-icon="i-lucide-arrow-right"
                class="my-4"
                @click="activeStep = 1"
              />
              <UButton
                v-if="isEmpty"
                label="Zur Speisekarte"
                size="xl"
                block
                icon="i-lucide-arrow-left"
                class="my-4"
                to="/speisekarte"
              />
            </div>
          </div>
        </template>

        <template #shipping>
          <div class="my-14">
            <CheckoutPaymentAndDelivery />
            <div class="w-full flex justify-end">
              <UButton
                label="Weiter zu Prüfen & Bestellen"
                trailing-icon="i-lucide-arrow-right"
                class="m-8 md:max-w-96"
                size="xl"
                block
                @click="activeStep = 2"
              />
            </div>
          </div>
        </template>

        <template #checkout>
          <CheckoutSummary />
        </template>
      </UStepper>
    </UPageBody>
  </UContainer>
</template>
