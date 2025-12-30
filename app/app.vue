<script setup lang="ts">
import type { Schemas } from "#shopware";
import * as Sentry from "@sentry/nuxt";
import { getNextOpeningTime } from "~/utils/businessHours";
import type { Toast } from "#ui/composables/useToast";

// Composables
const toast = useToast();
const appConfig = useAppConfig();
const runtimeConfig = useRuntimeConfig();
const { apiClient } = useShopwareContext();
const { refresh: refreshToppings } = useShopBiteConfig();
const { refreshCart } = useCart();
const { getWishlistProducts } = useWishlist();

// Initialize Sentry
Sentry.init({
  dsn: runtimeConfig.public.sentry.dsn,
});

// Initialize session context
const { data: sessionContextData } = await useAsyncData(
  "session-context",
  async () => {
    const response = await apiClient.invoke("readContext get /context");
    return response.data as Schemas["SalesChannelContext"];
  },
);

if (sessionContextData.value) {
  useSessionContext(sessionContextData.value);
}

// Toast configuration
const TOAST_CONFIG = {
  open: {
    id: "currently-open",
    title: "Wir haben geöffnet!",
    color: "primary" as const,
    progress: false,
    duration: 0,
    icon: "i-lucide-party-popper",
    actions: [
      {
        icon: "i-lucide-pizza",
        label: "Zur Speisekarte",
        color: "neutral" as const,
        variant: "outline" as const,
        onClick: () => navigateTo("/speisekarte"),
      },
    ],
  } as Partial<Toast>,
  closed: {
    id: "currently-closed",
    title: "Wir haben geschlossen!",
    color: "neutral" as const,
    progress: false,
    duration: 0,
  } as Partial<Toast>,
} as const;

function displayStoreStatus() {
  const isOpen = isStoreOpen();

  if (isOpen) {
    toast.add(TOAST_CONFIG.open);
  } else {
    const nextOpening = getNextOpeningTime(ref(new Date()));
    toast.add({
      ...TOAST_CONFIG.closed,
      description: nextOpening
        ? `Wir öffnen wieder ${nextOpening}`
        : "Öffnungszeiten siehe Website",
    });
  }
}

// Lifecycle
onMounted(async () => {
  await refreshToppings();
  await Promise.all([refreshCart(), getWishlistProducts()]);
  displayStoreStatus();
});
</script>

<template>
  <NuxtPwaManifest />
  <NuxtLoadingIndicator />

  <UApp :toaster="appConfig.toaster">
    <Header />
    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>
    <Footer />
  </UApp>
</template>
