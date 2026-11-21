<script setup lang="ts">
import type { Address } from "../../../shared/domain";

/**
 * An address of the session's guest or customer in the checkout (ADR
 * 0001, step 5): the lines of `AddressDetail` on the domain `Address`, and
 * "Adresse bearbeiten" through the BFF (`CheckoutAddressForm`).
 */
defineProps<{
  address: Address;
  withEditButton?: boolean;
}>();

const editMode = ref(false);
</script>

<template>
  <div class="font-body text-sb-ink">
    <div v-if="!editMode" class="flex flex-col items-start gap-3">
      <address class="flex flex-col not-italic">
        <span>{{ address.firstName }} {{ address.lastName }}</span>
        <span v-if="address.company">{{ address.company }}</span>
        <span v-if="address.department">{{ address.department }}</span>
        <span>{{ address.street }}</span>
        <span v-if="address.additionalLine">{{ address.additionalLine }}</span>
        <span>{{ address.postalCode }} {{ address.city }}</span>
        <span v-if="address.phone" class="text-sb-ink-muted"
          >Tel. {{ address.phone }}</span
        >
      </address>
      <SbButton
        v-if="withEditButton"
        variant="secondary"
        @click="editMode = true"
        >Adresse bearbeiten</SbButton
      >
    </div>
    <CheckoutAddressForm
      v-else
      :address="address"
      @submit-success="editMode = false"
    />
  </div>
</template>
