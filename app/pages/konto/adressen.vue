<script setup lang="ts">
import { useAddress, useUser } from "@shopware/composables";

definePageMeta({
  layout: "account",
});

const toast = useToast();
const { userDefaultShippingAddress, userDefaultBillingAddress, refreshUser } =
  useUser();
const {
  customerAddresses,
  loadCustomerAddresses,
  setDefaultCustomerBillingAddress,
  setDefaultCustomerShippingAddress,
} = useAddress();

onMounted(async () => {
  await loadCustomerAddresses();
});

const reloadCustomerData = async () => {
  openEditModal.value = false;
  openNewModal.value = false;
  await loadCustomerAddresses();
  await refreshUser();
};

async function makeDefaultShippingAddress(addressId: string) {
  await setDefaultCustomerShippingAddress(addressId);
  await reloadCustomerData();
  toast.add({
    title: "Standard Lieferadresse wurde geändert!",
    color: "success",
  });
}

async function makeDefaultBillingAddress(addressId: string) {
  await setDefaultCustomerBillingAddress(addressId);
  await reloadCustomerData();
  toast.add({
    title: "Standard Rechnungsadresse wurde geändert!",
    color: "success",
  });
}

const openEditModal = ref(false);
const openNewModal = ref(false);
</script>

<template>
  <UContainer>
    <UPageHeader
      headline="KONTO"
      title="Adressen"
      description="Verwalte deine Adressen."
    />
    <UPageBody>
      <div class="relative grid grid-cols-1 sm:grid-cols-2 gap-8">
        <AddressCard
          v-if="userDefaultShippingAddress"
          :address="userDefaultShippingAddress"
          title="Standard Lieferadresse"
          icon="i-lucide-house"
        />
        <AddressCard
          v-if="userDefaultBillingAddress"
          :address="userDefaultBillingAddress"
          title="Standard Rechnungsadresse"
          icon="i-lucide-receipt-text"
        />
      </div>
      <USeparator label="Alle Adressen" color="primary" />
      <UPageGrid>
        <div
          v-for="address in customerAddresses ?? []"
          :key="address.id"
          class="space-y-4"
        >
          <AddressCard :address="address" />
          <div class="flex justify-between">
            <UModal v-model:open="openEditModal" title="Adresse bearbeiten">
              <UButton
                label="Bearbeiten"
                variant="outline"
                icon="i-lucide-pen"
              />
              <template #body>
                <div class="p-8">
                  <AddressForm
                    :address="address"
                    @submit-success="reloadCustomerData"
                  />
                </div>
              </template>
            </UModal>
            <div class="flex gap-2">
              <UTooltip
                v-if="address.id !== userDefaultShippingAddress?.id"
                text="Als Standard Lieferaddresse setzten"
              >
                <UButton
                  color="secondary"
                  variant="subtle"
                  icon="i-lucide-house"
                  @click="makeDefaultShippingAddress(address.id)"
                />
              </UTooltip>
              <UTooltip
                v-if="address.id !== userDefaultBillingAddress?.id"
                text="Als Standard Rechnungsaddresse setzten"
              >
                <UButton
                  color="secondary"
                  variant="subtle"
                  icon="i-lucide-receipt-text"
                  @click="makeDefaultBillingAddress(address.id)"
                />
              </UTooltip>
            </div>
          </div>
        </div>
      </UPageGrid>
      <UModal v-model:open="openNewModal" title="Neue Adresse erstellen">
        <UButton label="Neue Adresse hinzufügen" icon="i-lucide-plus" />

        <template #body>
          <div class="p-8">
            <AddressForm :address="{}" @submit-success="reloadCustomerData" />
          </div>
        </template>
      </UModal>
    </UPageBody>
  </UContainer>
</template>
