<script setup lang="ts">
const route = useRoute();

// Account navigation (#445).
// By route name: the paths are the shop's locale's (ADR 0002).
const links = [
  { label: "account.nav.overview", to: { name: "konto" }, current: ["konto"] },
  {
    label: "account.nav.orders",
    to: { name: "konto-bestellungen" },
    current: ["konto-bestellungen", "konto-bestellung-id"],
  },
  {
    label: "account.nav.profile",
    to: { name: "konto-profil" },
    current: ["konto-profil"],
  },
  {
    label: "account.nav.addresses",
    to: { name: "konto-adressen" },
    current: ["konto-adressen"],
  },
];
const isCurrent = (current: string[]) => current.includes(String(route.name));
const { isLoggedIn, logout } = useCustomer();

onMounted(() => {
  if (!isLoggedIn.value) {
    navigateTo({ name: "anmelden" });
  }
});

watch(isLoggedIn, (newValue) => {
  if (!newValue) {
    navigateTo({ name: "anmelden" });
  }
});

const logoutHandler = () => {
  logout().catch((error) =>
    console.error("[account] logout", domainErrorCode(error) ?? "no answer"),
  );
};
</script>
<template>
  <div
    class="mx-auto w-full max-w-(--sb-container) px-4 pt-8 pb-16 font-body text-sb-ink sm:px-6 sm:pt-12 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12 lg:px-8"
  >
    <nav
      :aria-label="$t('account.shared.customerAccount')"
      class="mb-8 lg:mb-0"
    >
      <ul
        class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
      >
        <li v-for="link in links" :key="link.to.name" class="shrink-0">
          <NuxtLink
            :to="link.to"
            :aria-current="isCurrent(link.current) ? 'page' : undefined"
            class="flex min-h-11 items-center rounded-sb-control px-4 font-semibold whitespace-nowrap hover:bg-sb-muted focus-visible:outline-3 focus-visible:outline-sb-focus aria-[current=page]:bg-sb-primary-tint aria-[current=page]:text-sb-primary-ink"
            >{{ $t(link.label) }}</NuxtLink
          >
        </li>
        <li class="shrink-0 lg:mt-4 lg:border-t lg:border-sb-line lg:pt-4">
          <button
            type="button"
            class="flex min-h-11 w-full items-center rounded-sb-control px-4 font-semibold whitespace-nowrap text-sb-ink-muted hover:bg-sb-muted focus-visible:outline-3 focus-visible:outline-sb-focus"
            @click="logoutHandler"
          >
            {{ $t("account.nav.logout") }}
          </button>
        </li>
      </ul>
    </nav>
    <div class="min-w-0">
      <slot />
    </div>
  </div>
</template>
