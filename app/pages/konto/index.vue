<script setup lang="ts">
definePageMeta({
  layout: "account",
});

useSeoMeta({
  title: "Mein Konto",
});

const { user, userDefaultShippingAddress, userDefaultBillingAddress } =
  useUser();
const { hasPreset } = useThemePreset();
const sameAddress = computed(
  () =>
    userDefaultShippingAddress.value?.id ===
    userDefaultBillingAddress.value?.id,
);
</script>

<template>
  <div v-if="hasPreset" class="font-body text-sb-ink">
    <UserAccountHeaderPreset
      :title="user?.firstName ? `Hallo ${user.firstName}` : 'Mein Konto'"
      description="Ihre Daten, Adressen und Bestellungen."
    />
    <div class="grid gap-4 md:grid-cols-2">
      <section
        class="flex flex-col items-start gap-3 rounded-sb-card border border-sb-line bg-sb-surface p-5"
      >
        <h2 class="font-display text-xl">Profil</h2>
        <p>
          <span class="block">{{ user?.firstName }} {{ user?.lastName }}</span>
          <span class="text-sb-ink-muted">{{ user?.email }}</span>
        </p>
        <SbButton variant="secondary" to="/konto/profil"
          >Profil bearbeiten</SbButton
        >
      </section>
      <section
        class="flex flex-col items-start gap-3 rounded-sb-card border border-sb-line bg-sb-surface p-5"
      >
        <h2 class="font-display text-xl">Bestellungen</h2>
        <p class="text-sb-ink-muted">Alle Bestellungen mit Status und Beleg.</p>
        <SbButton variant="secondary" to="/konto/bestellungen"
          >Bestellungen ansehen</SbButton
        >
      </section>
      <AddressCard
        v-if="userDefaultShippingAddress"
        :address="userDefaultShippingAddress"
        :title="sameAddress ? 'Liefer- und Rechnungsadresse' : 'Lieferadresse'"
      >
        <SbButton variant="secondary" to="/konto/adressen" class="self-start"
          >Adressen verwalten</SbButton
        >
      </AddressCard>
      <AddressCard
        v-if="userDefaultBillingAddress && !sameAddress"
        :address="userDefaultBillingAddress"
        title="Rechnungsadresse"
      />
    </div>
  </div>
  <UContainer v-else>
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
