<script setup lang="ts">
const {
  voucherCode,
  voucherLoading,
  voucherError,
  applyVoucher,
  appliedPromotionCodes,
  removeItem,
} = useVoucherCode();
const voucherId = useId();
</script>

<template>
  <div class="flex flex-col gap-2 font-body text-sb-ink">
    <form class="flex gap-2" @submit.prevent="applyVoucher">
      <label :for="voucherId" class="sr-only">Gutscheincode</label>
      <SbInput
        :id="voucherId"
        v-model="voucherCode"
        name="voucher"
        placeholder="Gutscheincode"
        autocomplete="off"
        class="flex-1"
        :invalid="!!voucherError"
        :aria-describedby="voucherError ? `${voucherId}-fehler` : undefined"
        :disabled="voucherLoading"
      />
      <SbButton
        type="submit"
        variant="secondary"
        :loading="voucherLoading"
        :disabled="!voucherCode.trim() || voucherLoading"
        >Einlösen</SbButton
      >
    </form>
    <p
      v-if="voucherError"
      :id="`${voucherId}-fehler`"
      role="alert"
      class="text-sm font-semibold text-sb-danger"
    >
      {{ voucherError }}
    </p>
    <ul v-if="appliedPromotionCodes.length" class="flex flex-col gap-1">
      <li
        v-for="promo in appliedPromotionCodes"
        :key="promo.id"
        class="flex items-center justify-between gap-2 rounded-sb-control bg-sb-primary-tint ps-3 text-sm font-semibold text-sb-primary-ink"
      >
        <span>Gutschein: {{ promo.label }}</span>
        <SbIconButton
          :label="`Gutschein ${promo.label} entfernen`"
          variant="ghost"
          @click="removeItem(promo)"
        >
          <SbIcon name="close" :size="16" />
        </SbIconButton>
      </li>
    </ul>
  </div>
</template>
