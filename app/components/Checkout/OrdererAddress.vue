<script setup lang="ts">
import type { Address } from "../../../shared/domain";
import type { AccountAddressInput } from "~/composables/useAccountAddresses";

/**
 * An address of the session's guest or customer in the checkout (ADR
 * 0001): its lines (`AddressDetail`), and "Adresse bearbeiten" in the one
 * address form, saved through the checkout's BFF route.
 */
defineProps<{
  address: Address;
  withEditButton?: boolean;
}>();

const editMode = ref(false);
const { updateAddress } = useCheckoutOrderer();
// the address keeps its country (an empty one: the adapter's)
const save = (address: AccountAddressInput) =>
  updateAddress({ ...address, country: address.country ?? "" });
</script>

<template>
  <div class="font-body text-sb-ink">
    <div v-if="!editMode" class="flex flex-col items-start gap-3">
      <AddressDetail :address="address" />
      <SbButton
        v-if="withEditButton"
        variant="secondary"
        @click="editMode = true"
        >Adresse bearbeiten</SbButton
      >
    </div>
    <AddressForm
      v-else
      :address="address"
      :save="save"
      @submit-success="editMode = false"
    />
  </div>
</template>
