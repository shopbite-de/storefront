<script setup lang="ts">
import { shopLocale } from "#shopbite-locale";
import { formatDate } from "~/utils/formatDate";

definePageMeta({
  layout: "account",
});

const { t } = useI18n();

useSeoMeta({
  title: t("account.orders.pageTitle"),
});

// the customer's orders through the BFF (ADR 0001, step 6)
const { orders, load } = useAccountOrders();
const loaded = ref(false);

onMounted(async () => {
  try {
    await load();
  } catch (error) {
    console.error("[account] orders", domainErrorCode(error) ?? "no answer");
  } finally {
    loaded.value = true;
  }
});

const { getFormattedMoney } = useCommercePrice();
</script>

<template>
  <div class="font-body text-sb-ink">
    <UserAccountHeader :title="$t('account.orders.title')" />
    <p v-if="!loaded" role="status" class="text-sb-ink-muted">
      {{ $t("account.orders.loading") }}
    </p>
    <div
      v-else-if="!orders?.length"
      class="flex flex-col items-start gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6"
    >
      <p>{{ $t("account.orders.empty") }}</p>
      <SbButton :to="{ name: 'index' }">{{
        $t("account.orders.toHome")
      }}</SbButton>
    </div>
    <ul
      v-else
      class="flex flex-col overflow-hidden rounded-sb-card border border-sb-line bg-sb-surface"
    >
      <li
        v-for="order in orders"
        :key="order.id"
        class="border-b border-sb-line last:border-b-0"
      >
        <NuxtLink
          :to="{ name: 'konto-bestellung-id', params: { id: order.id } }"
          class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 p-4 hover:bg-sb-muted focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-sb-focus sm:p-5"
        >
          <i18n-t
            keypath="account.orders.order"
            tag="span"
            scope="global"
            class="font-bold"
          >
            <template #number>
              <span class="tabular-nums">{{ order.number }}</span>
            </template>
          </i18n-t>
          <span class="font-bold tabular-nums">{{
            getFormattedMoney(order.total)
          }}</span>
          <span class="text-sm text-sb-ink-muted">
            {{ formatDate(order.placedAt, shopLocale.language) }}
            · {{ $t(ORDER_STATUS_MESSAGE[order.status]) }}
          </span>
          <span
            class="flex items-center gap-1 text-sm font-semibold text-sb-primary-ink"
            >{{ $t("account.orders.details") }}
            <SbIcon name="chevron-right" :size="16"
          /></span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
