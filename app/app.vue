<script setup lang="ts">
import { onMounted } from "vue";
import type { Schemas } from "#shopware";
import * as Sentry from "@sentry/nuxt";
import { useRuntimeConfig } from "#imports";
import { isStoreOpen } from "~/utils/storeHours";
import { getNextOpeningTime } from "~/utils/businessHours";

const { refresh } = usePizzaToppings();
const toast = useToast();


const colorMode = useColorMode();

const color = computed(() =>
  colorMode.value === "dark" ? "#171717" : "white",
);

useHead({
  meta: [
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { key: "theme-color", name: "theme-color", content: color },
  ],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: "de",
  },
});

refresh();

Sentry.init({
  dsn: useRuntimeConfig().public.sentry.dsn,
});

useSeoMeta({
  title: "Pizzeria La Fattoria - Alte Schmiede",
  ogTitle: "Pizzeria La Fattoria - Alte Schmiede",
  description: "Italienisch-deutsche Küche in Obertshausen",
  ogDescription: "Italienisch-deutsche Küche in Obertshausen",
});

const appConfig = useAppConfig();
const { apiClient } = useShopwareContext();
const sessionContextData = ref<Schemas["SalesChannelContext"]>();
const contextResponse = await apiClient.invoke("readContext get /context");
sessionContextData.value = contextResponse.data;

useSessionContext(sessionContextData.value as Schemas["SalesChannelContext"]);
const { getWishlistProducts } = useWishlist();
const { refreshCart } = useCart();
onMounted(() => {
  refreshCart();
  getWishlistProducts();
  displayStoreStatus();
});

const now = ref(new Date());

async function displayStoreStatus() {
  const isOpen = isStoreOpen();

  const nextOpening = getNextOpeningTime(now);

  if (isOpen) {
    toast.add({
      id: "currently-open",
      title: "Wir haben geöffnet!",
      color: "primary",
      progress: false,
      duration: 0,
      icon: "i-lucide-party-popper",
      actions: [{
        icon: 'i-lucide-pizza',
        label: 'Zur Speisekarte',
        color: 'neutral',
        variant: 'outline',
        onClick: () => {
          navigateTo('/speisekarte')
        }
      }]
    });
  } else {
    toast.add({
      id: "currently-closed",
      title: "Wir haben geschlossen!",
      description: nextOpening
        ? `Wir öffnen wieder ${nextOpening}`
        : "Öffnungszeiten siehe Website",
      color: "neutral",
      progress: false,
      duration: 0,
    });
  }
};
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
