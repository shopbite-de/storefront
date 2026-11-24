<script setup lang="ts">
import { shopLocale } from "#shopbite-locale";
import { formatDate } from "~/utils/formatDate";

/**
 * Order confirmation and order page of the presets (#445): what the guest
 * sees right after ordering (`success`) and when opening the order later
 * (`detail`). Loads the order of the session in the browser
 * (`useOrder`, ADR 0001 step 5).
 */
const props = withDefaults(
  defineProps<{
    orderId: string;
    kind?: "success" | "detail";
  }>(),
  { kind: "detail" },
);

const { order, load } = useOrder(props.orderId);
const { site } = useRuntimeConfig().public;

const state = ref<"loading" | "ready" | "failed">("loading");

onMounted(async () => {
  try {
    await load();
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
        {{ $t("order.confirmation.thanks") }}
      </h1>
      <p class="text-lg">
        {{ $t("order.confirmation.received") }}
        <i18n-t
          v-if="order?.number"
          keypath="order.confirmation.number"
          scope="global"
        >
          <template #number>
            <strong class="tabular-nums">{{ order.number }}</strong>
          </template>
        </i18n-t>
      </p>
    </header>
    <header v-else class="flex flex-col gap-1">
      <p class="text-sm font-bold tracking-wide text-sb-accent uppercase">
        {{ $t("order.confirmation.kicker") }}
      </p>
      <h1 class="font-display text-4xl leading-tight tabular-nums sm:text-5xl">
        {{ order?.number || $t("order.shared.yourOrder") }}
      </h1>
      <p v-if="order?.placedAt" class="text-sb-ink-muted">
        {{ formatDate(order.placedAt, shopLocale.language) }}
      </p>
    </header>

    <p v-if="state === 'loading'" role="status" class="text-sb-ink-muted">
      {{ $t("order.shared.loadingOrder") }}
    </p>
    <div
      v-else-if="state === 'failed'"
      role="alert"
      class="flex flex-col items-start gap-4 rounded-sb-card border-[1.5px] border-sb-danger bg-sb-surface p-6"
    >
      <p>
        <strong class="block">{{ $t("order.confirmation.loadFailed") }}</strong>
        <template v-if="kind === 'success'">
          {{ $t("order.confirmation.receivedAnyway") }}
        </template>
        {{ $t("order.confirmation.reload") }}
      </p>
    </div>
    <section
      v-else-if="order"
      aria-labelledby="bestellung-details"
      class="rounded-sb-card border border-sb-line bg-sb-surface p-6"
    >
      <h2 id="bestellung-details" class="mb-4 font-display text-2xl">
        {{ $t("order.shared.yourOrder") }}
      </h2>
      <OrderDetail :order="order" />
    </section>

    <section
      v-if="site.telephone"
      aria-labelledby="bestellung-anrufen"
      class="flex flex-col items-start gap-3 rounded-sb-card bg-sb-muted p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 id="bestellung-anrufen" class="font-bold">
          {{ $t("order.confirmation.somethingWrong") }}
        </h2>
        <p class="text-sb-ink-muted">
          {{ $t("order.confirmation.callUs") }}
        </p>
      </div>
      <SbButton variant="secondary" :to="toTelHref(site.telephone)">
        <SbIcon name="phone" />
        <span class="sr-only">{{ $t("order.confirmation.call") }}</span>
        {{ site.telephone }}
      </SbButton>
    </section>

    <SbButton variant="ghost" to="/" class="self-start">{{
      $t("order.confirmation.toHome")
    }}</SbButton>
  </div>
</template>
