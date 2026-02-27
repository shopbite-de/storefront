<script setup lang="ts">
import type { Toast } from "#ui/composables/useToast";

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

const { apiClient } = useShopwareContext();
const appConfig = useAppConfig();
const router = useRouter();
const toast = useToast();

const { data: sessionContextData } = await useAsyncData(
  "sessionContext",
  async () => {
    try {
      const { data } = await apiClient.invoke("readContext get /context");
      return data;
    } catch (error) {
      console.error("Failed to load session context", error);
      return null;
    }
  },
  {
    default: () => null,
  },
);

if (sessionContextData.value) {
  usePrice({
    currencyCode: sessionContextData.value.currency?.isoCode || "",
  });
  useSessionContext(sessionContextData.value);
}

const {
  getNextOpeningTime,
  isStoreOpen,
  refresh: refreshBusinessHours,
} = useBusinessHours();
const { isClosedHoliday, refresh: refreshHolidays } = useHolidays();

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

const { refreshCart } = useCart();
const { getWishlistProducts } = useWishlist();

if (import.meta.client) {
  // getting the wishlist products should not block SSR
  if (!(router.currentRoute.value.name as string).includes("wishlist")) {
    getWishlistProducts(); // initial page loading
  }
}

const { refresh: refreshToppings } = useShopBiteConfig();

onMounted(async () => {
  await Promise.all([
    refreshHolidays(),
    refreshBusinessHours(),
    refreshToppings(),
  ]);
  refreshCart();
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
