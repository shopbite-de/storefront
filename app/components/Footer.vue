<script setup lang="ts">
import {
  useNavigation,
  type NavigationMenuItem,
} from "~/composables/useNavigation";

/**
 * Footer of the presets (#455): shop name, address, phone, Google link,
 * opening hours with today's status (in the SSR HTML, local SEO #290) and
 * the footer navigation as link columns. No colour mode switch: the
 * preset fixes light or dark.
 */
const { footerMenu } = useNavigation(true);

const { site } = useRuntimeConfig().public;
const { businessHours, refresh } = useBusinessHours();
onServerPrefetch(() => refresh());

const openingHours = computed(() =>
  groupOpeningHours(businessHours.value ?? []),
);
const locality = [site.address.postalCode, site.address.city]
  .filter(Boolean)
  .join(" ");
const year = new Date().getFullYear();

function linkTarget(link: NavigationMenuItem): string | undefined {
  return typeof link.target === "string" ? link.target : undefined;
}

const columns = computed(() =>
  footerMenu.value.filter((column) => column.children?.length),
);
</script>

<template>
  <footer
    class="border-t border-sb-line bg-sb-bg font-body text-sb-ink"
    aria-labelledby="footer-title"
  >
    <div
      class="mx-auto flex w-full max-w-(--sb-container) flex-col gap-12 px-4 pt-14 pb-10 sm:px-6 lg:px-8"
    >
      <div
        class="grid gap-10 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]"
      >
        <address class="flex flex-col gap-3 not-italic">
          <h2 id="footer-title" class="font-display text-[28px] leading-none">
            {{ site.name }}
          </h2>
          <p
            v-if="site.address.street || locality"
            class="text-[15px] leading-relaxed text-sb-ink-muted"
          >
            <template v-if="site.address.street"
              >{{ site.address.street }}<br
            /></template>
            {{ locality }}
          </p>
          <a
            v-if="site.telephone"
            :href="toTelHref(site.telephone)"
            class="inline-flex min-h-11 items-center gap-2 self-start font-bold text-sb-ink hover:text-sb-primary-ink focus-visible:outline-3 focus-visible:outline-sb-focus"
          >
            <SbIcon name="phone" :size="16" />
            {{ site.telephone }}
          </a>
          <a
            v-if="site.googleBusinessProfileUrl"
            :href="site.googleBusinessProfileUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex min-h-11 items-center self-start text-[15px] text-sb-ink-muted underline underline-offset-4 hover:text-sb-ink focus-visible:outline-3 focus-visible:outline-sb-focus"
          >
            Auf Google ansehen
          </a>
        </address>

        <section
          v-if="openingHours.length"
          id="oeffnungszeiten"
          class="flex scroll-mt-24 flex-col gap-3"
          aria-labelledby="footer-hours"
        >
          <h2 id="footer-hours" class="text-sm font-bold">Öffnungszeiten</h2>
          <FooterStoreStatus />
          <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[15px]">
            <template v-for="row in openingHours" :key="row.days">
              <dt class="font-semibold">{{ row.days }}</dt>
              <dd class="text-sb-ink-muted tabular-nums">
                {{
                  row.intervals.length ? row.intervals.join(", ") : "Ruhetag"
                }}
              </dd>
            </template>
          </dl>
        </section>

        <div
          v-if="columns.length"
          class="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-2 lg:col-span-1"
        >
          <nav
            v-for="column in columns"
            :key="column.label"
            :aria-label="column.label"
            class="flex flex-col gap-1"
          >
            <h2 class="mb-1 text-sm font-bold">{{ column.label }}</h2>
            <NuxtLink
              v-for="link in column.children"
              :key="String(link.to)"
              :to="link.to"
              :target="linkTarget(link)"
              class="inline-flex min-h-9 items-center text-[15px] text-sb-ink-muted hover:text-sb-ink focus-visible:outline-3 focus-visible:outline-sb-focus"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>
        </div>
      </div>

      <div
        class="flex flex-col gap-3 border-t border-sb-line pt-6 text-[13px] text-sb-ink-muted sm:flex-row sm:items-center sm:justify-between"
      >
        <p>
          © {{ year }} {{ site.name }} · Alle Preise inkl. MwSt., zzgl.
          Liefergebühr, wenn nicht anders angegeben
        </p>
        <a
          href="https://shopbite.de"
          target="_blank"
          rel="noopener"
          class="inline-flex min-h-11 items-center hover:text-sb-ink focus-visible:outline-3 focus-visible:outline-sb-focus"
          >Online bestellen mit ShopBite</a
        >
      </div>
    </div>
  </footer>
</template>
