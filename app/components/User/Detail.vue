<script setup lang="ts">
/**
 * "Ihre Angaben" in the checkout (#443): the session's guest or customer
 * with the addresses the order uses (ADR 0001, step 5: the domain
 * `Orderer` of the BFF), as plain text; each address can be edited.
 */
defineProps<{
  withEditButton?: boolean;
}>();

const { orderer } = useCheckoutOrderer();

const fullName = computed(
  () =>
    `${orderer.value?.customer.firstName} ${orderer.value?.customer.lastName}`,
);

const areAddressesDifferent = computed(() => {
  const value = orderer.value;
  if (!value) return false;
  return (
    JSON.stringify(value.billingAddress) !==
    JSON.stringify(value.deliveryAddress)
  );
});
</script>

<template>
  <div v-if="orderer" class="flex flex-col gap-4 font-body text-sb-ink">
    <p>
      <strong class="block">{{ fullName }}</strong>
      <span class="text-sb-ink-muted">{{ orderer.customer.email }}</span>
    </p>
    <div class="flex flex-col gap-2 border-t border-sb-line pt-4">
      <h3 class="text-sm font-bold">
        {{
          areAddressesDifferent
            ? $t("account.shared.deliveryAddress")
            : $t("account.shared.deliveryAndBillingAddress")
        }}
      </h3>
      <CheckoutOrdererAddress
        :key="orderer.deliveryAddress.id ?? 'delivery'"
        :address="orderer.deliveryAddress"
        :with-edit-button="withEditButton"
      />
    </div>
    <div
      v-if="areAddressesDifferent"
      class="flex flex-col gap-2 border-t border-sb-line pt-4"
    >
      <h3 class="text-sm font-bold">
        {{ $t("account.shared.billingAddress") }}
      </h3>
      <CheckoutOrdererAddress
        :key="orderer.billingAddress.id ?? 'billing'"
        :address="orderer.billingAddress"
        :with-edit-button="withEditButton"
      />
    </div>
  </div>
</template>
