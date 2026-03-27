<script setup lang="ts">
const {
  voucherCode,
  voucherLoading,
  applyVoucher,
  appliedPromotionCodes,
  removeItem,
} = useVoucherCode();
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-row gap-2">
      <UInput
        v-model="voucherCode"
        placeholder="Gutscheincode"
        class="flex-1"
        :disabled="voucherLoading"
        @keyup.enter="applyVoucher"
      />
      <UButton
        label="Einlösen"
        variant="outline"
        :loading="voucherLoading"
        :disabled="!voucherCode.trim() || voucherLoading"
        @click="applyVoucher"
      />
    </div>
    <div
      v-for="promo in appliedPromotionCodes"
      :key="promo.id"
      class="flex flex-row justify-between items-center text-sm text-success"
    >
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-tag" />
        {{ promo.label }}
      </span>
      <UButton
        icon="i-lucide-x"
        size="xs"
        variant="ghost"
        color="neutral"
        aria-label="Gutschein entfernen"
        @click="removeItem(promo)"
      />
    </div>
  </div>
</template>
