<script setup lang="ts">
import { useOrderDetails } from "@shopware/composables";
import { formatDate } from "~/utils/formatDate";

/**
 * Order confirmation and order page of the presets (#445): what the guest
 * sees right after ordering (`success`) and when opening the order later
 * (`detail`). Loads the order in the browser, like the Nuxt UI pages.
 */
const props = withDefaults(
  defineProps<{
    orderId: string;
    kind?: "success" | "detail";
  }>(),
  { kind: "detail" },
);

const { order, loadOrderDetails, status } = useOrderDetails(props.orderId);
const { site } = useRuntimeConfig().public;

const state = ref<"loading" | "ready" | "failed">("loading");

onMounted(async () => {
  try {
    await loadOrderDetails();
    state.value = order.value ? "ready" : "failed";
  } catch (error) {
    console.error("[order][load]", error);
    state.value = "failed";
  }
});
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-2xl flex-col gap-6 font-body text-sb-ink"
  >
    <header v-if="kind === 'success'" class="flex flex-col items-start gap-3">
      <span
        class="flex size-14 items-center justify-center rounded-full bg-sb-primary-tint text-sb-primary-ink"
      >
        <SbIcon name="check" :size="28" />
      </span>
      <h1 class="font-display text-4xl leading-tight sm:text-5xl">
        Vielen Dank für Ihre Bestellung
      </h1>
      <p class="text-lg">
        Wir haben sie erhalten und bereiten sie jetzt vor.
        <template v-if="order?.orderNumber">
          Ihre Bestellnummer ist
          <strong class="tabular-nums">{{ order.orderNumber }}</strong
          >.
        </template>
      </p>
    </header>
    <header v-else class="flex flex-col gap-1">
      <p class="text-sm font-bold tracking-wide text-sb-accent uppercase">
        Bestellung
      </p>
      <h1 class="font-display text-4xl leading-tight tabular-nums sm:text-5xl">
        {{ order?.orderNumber ?? "Ihre Bestellung" }}
      </h1>
      <p v-if="order?.createdAt" class="text-sb-ink-muted">
        {{ formatDate(order.createdAt) }}
      </p>
    </header>

    <p v-if="state === 'loading'" role="status" class="text-sb-ink-muted">
      Bestellung wird geladen …
    </p>
    <div
      v-else-if="state === 'failed'"
      role="alert"
      class="flex flex-col items-start gap-4 rounded-sb-card border-[1.5px] border-sb-danger bg-sb-surface p-6"
    >
      <p>
        <strong class="block"
          >Die Bestellung konnte nicht geladen werden.</strong
        >
        <template v-if="kind === 'success'">
          Ihre Bestellung ist trotzdem bei uns eingegangen.
        </template>
        Bitte laden Sie die Seite neu oder rufen Sie uns an.
      </p>
    </div>
    <section
      v-else-if="order"
      aria-labelledby="bestellung-details"
      class="rounded-sb-card border border-sb-line bg-sb-surface p-6"
    >
      <h2 id="bestellung-details" class="mb-4 font-display text-2xl">
        Ihre Bestellung
      </h2>
      <OrderDetailPreset :order="order" :status="status" />
    </section>

    <section
      v-if="site.telephone"
      aria-labelledby="bestellung-anrufen"
      class="flex flex-col items-start gap-3 rounded-sb-card bg-sb-muted p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 id="bestellung-anrufen" class="font-bold">Stimmt etwas nicht?</h2>
        <p class="text-sb-ink-muted">
          Rufen Sie uns gleich an, dann können wir Ihre Bestellung noch ändern.
        </p>
      </div>
      <SbButton variant="secondary" :to="toTelHref(site.telephone)">
        <SbIcon name="phone" />
        <span class="sr-only">Anrufen:</span>
        {{ site.telephone }}
      </SbButton>
    </section>

    <SbButton variant="ghost" to="/" class="self-start"
      >Zur Startseite</SbButton
    >
  </div>
</template>
