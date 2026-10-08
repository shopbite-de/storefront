<script setup lang="ts">
import { useAddress, useUser } from "@shopware/composables";
import type { Schemas } from "#shopware";

definePageMeta({
  layout: "account",
});

useSeoMeta({
  title: "Adressen",
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

onMounted(() => {
  reloadCustomerData();
});

const reloadCustomerData = async () => {
  openEditModal.value = false;
  openNewModal.value = false;
  await loadCustomerAddresses();
  await refreshUser({
    associations: {
      defaultShippingAddress: {},
      defaultBillingAddress: {},
      activeShippingAddress: {},
      activeBillingAddress: {},
    },
  });
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

// Presets (#445): one sheet for editing and adding, results announced in
// the page instead of toasts.
const { hasPreset } = useThemePreset();
const sheetOpen = ref(false);
const editedAddress = ref<Schemas["CustomerAddress"] | undefined>();
const notice = ref("");

function openSheet(address?: Schemas["CustomerAddress"]) {
  editedAddress.value = address;
  sheetOpen.value = true;
}

async function onSaved() {
  sheetOpen.value = false;
  notice.value = editedAddress.value
    ? "Die Adresse ist gespeichert."
    : "Die Adresse ist angelegt.";
  await reloadCustomerData();
}

async function setDefault(kind: "shipping" | "billing", addressId: string) {
  if (kind === "shipping") await setDefaultCustomerShippingAddress(addressId);
  else await setDefaultCustomerBillingAddress(addressId);
  await reloadCustomerData();
  notice.value =
    kind === "shipping"
      ? "Die Lieferadresse ist geändert."
      : "Die Rechnungsadresse ist geändert.";
}
</script>

<template>
  <div v-if="hasPreset" class="font-body text-sb-ink">
    <UserAccountHeaderPreset title="Adressen" />
    <p
      role="status"
      :class="
        notice
          ? 'mb-4 rounded-sb-control bg-sb-primary-tint p-4 text-sm text-sb-primary-ink'
          : ''
      "
    >
      {{ notice }}
    </p>
    <SbButton class="mb-6" @click="openSheet()">
      <SbIcon name="plus" />
      Neue Adresse
    </SbButton>
    <ul class="grid gap-4 md:grid-cols-2">
      <li
        v-for="address in customerAddresses ?? []"
        :key="address.id"
        class="flex flex-col gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-5"
      >
        <ul
          v-if="
            address.id === userDefaultShippingAddress?.id ||
            address.id === userDefaultBillingAddress?.id
          "
          class="flex flex-wrap gap-2"
          aria-label="Verwendung"
        >
          <li
            v-if="address.id === userDefaultShippingAddress?.id"
            class="rounded-sb-control bg-sb-primary-tint px-3 py-1 text-sm font-bold text-sb-primary-ink"
          >
            Lieferadresse
          </li>
          <li
            v-if="address.id === userDefaultBillingAddress?.id"
            class="rounded-sb-control bg-sb-muted px-3 py-1 text-sm font-bold"
          >
            Rechnungsadresse
          </li>
        </ul>
        <AddressDetail :address="address" />
        <div class="mt-auto flex flex-wrap gap-2">
          <SbButton variant="secondary" @click="openSheet(address)">
            Bearbeiten
            <span class="sr-only"
              >: {{ address.street }}, {{ address.city }}</span
            >
          </SbButton>
          <SbButton
            v-if="address.id !== userDefaultShippingAddress?.id"
            variant="ghost"
            @click="setDefault('shipping', address.id)"
            >Als Lieferadresse
            <span class="sr-only"
              >: {{ address.street }}, {{ address.city }}</span
            ></SbButton
          >
          <SbButton
            v-if="address.id !== userDefaultBillingAddress?.id"
            variant="ghost"
            @click="setDefault('billing', address.id)"
            >Als Rechnungsadresse
            <span class="sr-only"
              >: {{ address.street }}, {{ address.city }}</span
            ></SbButton
          >
        </div>
      </li>
    </ul>
    <SbSheet
      v-if="sheetOpen"
      v-model:open="sheetOpen"
      :title="editedAddress ? 'Adresse bearbeiten' : 'Neue Adresse'"
    >
      <AddressFormPreset
        :key="editedAddress?.id ?? 'neu'"
        :address="editedAddress"
        @submit-success="onSaved"
      />
    </SbSheet>
  </div>
  <UContainer v-else>
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
            <AddressForm
              :address="undefined"
              @submit-success="reloadCustomerData"
            />
          </div>
        </template>
      </UModal>
    </UPageBody>
  </UContainer>
</template>
