<script setup lang="ts">
import type { Address } from "../../../shared/domain";

/** The lines of a domain `Address` (account, checkout, order pages). */
defineProps<{ address: Address | null | undefined }>();
</script>

<template>
  <address
    v-if="address"
    class="flex flex-col font-body text-sb-ink not-italic"
  >
    <span>{{ address.firstName }} {{ address.lastName }}</span>
    <span v-if="address.company">{{ address.company }}</span>
    <span v-if="address.department">{{ address.department }}</span>
    <span>{{ address.street }}</span>
    <span v-if="address.additionalLine">{{ address.additionalLine }}</span>
    <span>{{ address.postalCode }} {{ address.city }}</span>
    <span v-if="address.phone" class="text-sb-ink-muted">{{
      $t("account.addressDetail.phone", { phone: address.phone })
    }}</span>
  </address>
</template>
