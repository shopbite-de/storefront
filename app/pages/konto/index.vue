<script setup lang="ts">
definePageMeta({
  layout: "account",
});

useSeoMeta({
  title: "Mein Konto",
});

const { user, userDefaultShippingAddress, userDefaultBillingAddress } =
  useUser();
const sameAddress = computed(
  () =>
    userDefaultShippingAddress.value?.id ===
    userDefaultBillingAddress.value?.id,
);
</script>

<template>
  <div class="font-body text-sb-ink">
    <UserAccountHeader
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
</template>
