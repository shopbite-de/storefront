<script setup lang="ts">
const { site } = useRuntimeConfig().public;
const { businessHours, refresh } = useBusinessHours();

// Put the opening hours into the server-rendered HTML (local SEO, #290);
// app.vue refreshes them on mount for the open/closed toast.
onServerPrefetch(() => refresh());

const openingHours = computed(() =>
  groupOpeningHours(businessHours.value ?? []),
);

const { street, postalCode, city } = site.address;
const locality = [postalCode, city].filter(Boolean).join(" ");
const hasContact = Boolean(
  street || locality || site.telephone || site.googleBusinessProfileUrl,
);
</script>

<template>
  <div
    v-if="hasContact || openingHours.length"
    class="mb-10 grid gap-8 sm:grid-cols-2 xl:grid-cols-3"
  >
    <address v-if="hasContact" class="not-italic text-sm">
      <p class="font-semibold">{{ site.name }}</p>
      <div class="mt-6 space-y-1 text-muted">
        <p v-if="street">{{ street }}</p>
        <p v-if="locality">{{ locality }}</p>
      </div>
      <ul
        v-if="site.telephone || site.googleBusinessProfileUrl"
        class="mt-4 space-y-3"
      >
        <li v-if="site.telephone">
          <ULink
            :to="toTelHref(site.telephone)"
            class="flex items-center gap-1.5 text-muted hover:text-default"
          >
            <UIcon name="i-lucide-phone" class="size-4 shrink-0" />
            {{ site.telephone }}
          </ULink>
        </li>
        <li v-if="site.googleBusinessProfileUrl">
          <ULink
            :to="site.googleBusinessProfileUrl"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-1.5 text-muted hover:text-default"
          >
            <UIcon name="i-simple-icons-google" class="size-4 shrink-0" />
            Auf Google ansehen
          </ULink>
        </li>
      </ul>
    </address>

    <div v-if="openingHours.length" class="text-sm">
      <p class="font-semibold">Öffnungszeiten</p>
      <FooterStoreStatus class="mt-6" />
      <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-muted">
        <template v-for="row in openingHours" :key="row.days">
          <dt class="font-medium text-default">{{ row.days }}</dt>
          <dd>
            <span v-if="row.intervals.length === 0">Ruhetag</span>
            <span
              v-for="interval in row.intervals"
              :key="interval"
              class="block"
            >
              {{ interval }}
            </span>
          </dd>
        </template>
      </dl>
    </div>
  </div>
</template>
