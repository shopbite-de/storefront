<script setup lang="ts">
definePageMeta({
  layout: "account",
});

const { t } = useI18n();

useSeoMeta({
  title: t("account.overview.title"),
});

// the customer and the account's addresses through the BFF (ADR 0001, step 6)
const { customer: user } = useCustomer();
const {
  defaultDeliveryAddress: userDefaultShippingAddress,
  defaultBillingAddress: userDefaultBillingAddress,
  refresh: loadAddresses,
} = useAccountAddresses();
onMounted(() => {
  loadAddresses().catch((error) =>
    console.error("[account] addresses", domainErrorCode(error) ?? "no answer"),
  );
});
const sameAddress = computed(
  () =>
    userDefaultShippingAddress.value?.id ===
    userDefaultBillingAddress.value?.id,
);
</script>

<template>
  <div class="font-body text-sb-ink">
    <UserAccountHeader
      :title="
        user?.firstName
          ? $t('account.overview.greeting', { name: user.firstName })
          : $t('account.overview.title')
      "
      :description="$t('account.overview.description')"
    />
    <div class="grid gap-4 md:grid-cols-2">
      <section
        class="flex flex-col items-start gap-3 rounded-sb-card border border-sb-line bg-sb-surface p-5"
      >
        <h2 class="font-display text-xl">
          {{ $t("account.overview.profileHeading") }}
        </h2>
        <p>
          <span class="block">{{ user?.firstName }} {{ user?.lastName }}</span>
          <span class="text-sb-ink-muted">{{ user?.email }}</span>
        </p>
        <SbButton variant="secondary" :to="{ name: 'konto-profil' }">{{
          $t("account.overview.editProfile")
        }}</SbButton>
      </section>
      <section
        class="flex flex-col items-start gap-3 rounded-sb-card border border-sb-line bg-sb-surface p-5"
      >
        <h2 class="font-display text-xl">
          {{ $t("account.overview.ordersHeading") }}
        </h2>
        <p class="text-sb-ink-muted">
          {{ $t("account.overview.ordersText") }}
        </p>
        <SbButton variant="secondary" :to="{ name: 'konto-bestellungen' }">{{
          $t("account.overview.viewOrders")
        }}</SbButton>
      </section>
      <AddressCard
        v-if="userDefaultShippingAddress"
        :address="userDefaultShippingAddress"
        :title="
          sameAddress
            ? $t('account.shared.deliveryAndBillingAddress')
            : $t('account.shared.deliveryAddress')
        "
      >
        <SbButton
          variant="secondary"
          :to="{ name: 'konto-adressen' }"
          class="self-start"
          >{{ $t("account.overview.manageAddresses") }}</SbButton
        >
      </AddressCard>
      <AddressCard
        v-if="userDefaultBillingAddress && !sameAddress"
        :address="userDefaultBillingAddress"
        :title="$t('account.shared.billingAddress')"
      />
    </div>
  </div>
</template>
