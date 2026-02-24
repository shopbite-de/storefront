<script setup lang="ts">
import type { Schemas } from "#shopware";
import type { Toast } from "#ui/composables/useToast";

// Composables
const toast = useToast();
const appConfig = useAppConfig();
const { apiClient } = useShopwareContext();
const { refresh: refreshToppings } = useShopBiteConfig();
const { refreshCart } = useCart();
const { getWishlistProducts } = useWishlist();

const {
  getNextOpeningTime,
  isStoreOpen,
  refresh: refreshBusinessHours,
} = useBusinessHours();
const { isClosedHoliday, refresh: refreshHolidays } = useHolidays();

await Promise.all([refreshBusinessHours(), refreshHolidays()]);

const sessionContextData = ref<Schemas["SalesChannelContext"]>();

const contextResponse = await apiClient
  .invoke("readContext get /context")
  .catch((error) => {
    console.error("Error fetching session context data:", error);
    return { data: undefined };
  });

sessionContextData.value = contextResponse.data;
useSessionContext(sessionContextData.value);

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
  const isOpen = isStoreOpen(undefined, isClosedHoliday);

  if (isOpen) {
    toast.add(TOAST_CONFIG.open);
  } else {
    const nextOpening = getNextOpeningTime(ref(new Date()), isClosedHoliday);
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

useHead({
  htmlAttrs: {
    lang: "de",
  },
  link: [
    {
      rel: "icon",
      type: "image/png",
      href: "/favicon.ico",
    },
  ],
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
