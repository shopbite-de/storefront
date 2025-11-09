<script setup lang="ts">
definePageMeta({
  layout: "account",
});

const { user, userDefaultShippingAddress, userDefaultBillingAddress } =
  useUser();
</script>

<template>
  <UContainer>
    <UPageHeader
      headline="KONTO"
      title="Übersicht"
      description="Verwalte deine Nutzerdaten und Bestellungen."
    />
    <UPageBody>
      <UPageGrid>
        <div class="flex flex-col gap-2 w-full">
          <UPageCard
            class="h-full"
            icon="i-lucide-user"
            title="Persönliches Profil"
            :ui="{
              root: 'shadow-md rounded-md',
              footer: 'w-full',
            }"
          >
            <div class="h-full">
              <p>{{ user?.firstName }} {{ user?.lastName }}</p>
              <p>{{ user?.email }}</p>
            </div>
          </UPageCard>
          <UButton
            variant="outline"
            label="Bearbeiten"
            icon="i-lucide-pen"
            block
            to="/konto/profil"
          />
        </div>
        <div class="flex flex-col gap-2 w-full">
          <AddressCard
            :address="userDefaultShippingAddress"
            title="Standard Lieferadresse"
            icon="i-lucide-house"
          />
          <UButton
            variant="outline"
            label="Bearbeiten"
            icon="i-lucide-pen"
            block
            to="/konto/adressen"
          />
        </div>
        <div class="flex flex-col gap-2 w-full">
          <AddressCard
            :address="userDefaultBillingAddress"
            title="Standard Rechnungsadresse"
            icon="i-lucide-receipt-text"
            :with-edit-button="false"
          />
          <UButton
            variant="outline"
            label="Bearbeiten"
            icon="i-lucide-pen"
            block
            to="/konto/adressen"
          />
        </div>
      </UPageGrid>
    </UPageBody>
  </UContainer>
</template>
