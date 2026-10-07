<script setup lang="ts">
defineProps<{
  withEditButton?: boolean;
}>();

const {
  user,
  userDefaultBillingAddress,
  userDefaultShippingAddress,
  refreshUser,
} = useUser();

const fullName = computed(
  () => user.value?.firstName + " " + user.value?.lastName,
);

const areAddressesDifferent = computed(() => {
  if (!userDefaultBillingAddress.value || !userDefaultShippingAddress.value) {
    return false;
  }

  return (
    JSON.stringify(userDefaultBillingAddress.value) !==
    JSON.stringify(userDefaultShippingAddress.value)
  );
});

async function refreshUserAddresses() {
  await refreshUser({
    associations: {
      defaultShippingAddress: {},
      defaultBillingAddress: {},
      activeShippingAddress: {},
      activeBillingAddress: {},
    },
  });
}

async function handleAddressUpdate() {
  // Refresh user data from the API to get the latest addresses
  await refreshUserAddresses();
}

onMounted(() => {
  refreshUserAddresses();
});

// Presets: plain text in the checkout section instead of a card (#443).
const { hasPreset } = useThemePreset();
</script>

<template>
  <div v-if="hasPreset" class="flex flex-col gap-4 font-body text-sb-ink">
    <p>
      <strong class="block">{{ fullName }}</strong>
      <span class="text-sb-ink-muted">{{ user?.email }}</span>
    </p>
    <div class="flex flex-col gap-2 border-t border-sb-line pt-4">
      <h3 class="text-sm font-bold">
        {{
          areAddressesDifferent
            ? "Lieferadresse"
            : "Liefer- und Rechnungsadresse"
        }}
      </h3>
      <AddressDetail
        :address="userDefaultShippingAddress"
        :with-edit-button="withEditButton"
        @update:address="handleAddressUpdate"
      />
    </div>
    <div
      v-if="areAddressesDifferent"
      class="flex flex-col gap-2 border-t border-sb-line pt-4"
    >
      <h3 class="text-sm font-bold">Rechnungsadresse</h3>
      <AddressDetail
        :address="userDefaultBillingAddress"
        :with-edit-button="withEditButton"
        @update:address="handleAddressUpdate"
      />
    </div>
  </div>
  <UCard v-else class="mb-4">
    <div>{{ fullName }}</div>
    <div>{{ user?.email }}</div>
    <USeparator
      color="primary"
      class="my-6"
      :decorative="true"
      :label="
        areAddressesDifferent ? 'Lieferadresse' : 'Liefer- und Rechnungsadresse'
      "
    />
    <AddressDetail
      :address="userDefaultShippingAddress"
      :with-edit-button="withEditButton"
      @update:address="handleAddressUpdate"
    />
    <USeparator
      v-if="areAddressesDifferent"
      class="my-6"
      color="primary"
      :decorative="true"
      label="Rechnungsadresse"
    />
    <AddressDetail
      v-if="areAddressesDifferent"
      :address="userDefaultBillingAddress"
      :with-edit-button="withEditButton"
      @update:address="handleAddressUpdate"
    />
  </UCard>
</template>
