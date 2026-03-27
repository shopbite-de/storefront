<script setup lang="ts">
import type {
  RadioGroupItem,
  RadioGroupValue,
} from "#ui/components/RadioGroup.vue";
import type { Schemas } from "#shopware";

const {
  paymentMethods,
  getPaymentMethods,
  selectedPaymentMethod,
  setPaymentMethod,
  shippingMethods,
  getShippingMethods,
  selectedShippingMethod,
  setShippingMethod,
} = useCheckout();

const { refreshCart } = useCart();

const toast = useToast();

onMounted(() => {
  getPaymentMethods();
  getShippingMethods();
});

const selectablePaymentMethods = computed<RadioGroupItem[]>(() => {
  return paymentMethods.value?.map((method: Schemas["PaymentMethod"]) => ({
    label: method.distinguishableName,
    description: method.description,
    value: method.id,
  }));
});

const selectableShippingMethods = computed<RadioGroupItem[]>(() => {
  return shippingMethods.value?.map((method: Schemas["ShippingMethod"]) => ({
    label: method.name,
    description: method.description,
    value: method.id,
  }));
});

const selectedPaymentMethodId = ref<RadioGroupValue | undefined>(
  selectedPaymentMethod.value?.id,
);
const selectedShippingMethodId = ref<RadioGroupValue | undefined>(
  selectedShippingMethod.value?.id,
);

watch(
  selectedPaymentMethodId,
  async (newValue: RadioGroupValue | undefined) => {
    if (newValue === undefined) return;
    if (selectedPaymentMethod.value === null) return;
    await setPaymentMethod({ id: newValue as string });
    toast.add({
      title: "Zahlart geändert",
      description:
        selectedPaymentMethod.value.distinguishableName + " ausgewählt",
      color: "success",
      progress: false,
    });
  },
);

watch(
  selectedShippingMethodId,
  async (newValue: RadioGroupValue | undefined) => {
    if (newValue === undefined) return;
    if (selectedShippingMethod.value === null) return;
    await setShippingMethod({ id: newValue as string });
    await refreshCart();
    toast.add({
      title: "Versandart geändert",
      description: selectedShippingMethod.value.name + " ausgewählt",
      color: "success",
      progress: false,
    });
  },
);
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-badge-euro" class="size-5 text-muted" />
        <h2 class="text-lg font-semibold">Zahlungsarten</h2>
        <UButton
          to="/zahlung-und-versand"
          size="sm"
          variant="ghost"
          icon="i-lucide-circle-help"
        />
      </div>
      <URadioGroup
        v-model="selectedPaymentMethodId"
        :items="selectablePaymentMethods"
        variant="card"
      />
    </div>
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-car" class="size-5 text-muted" />
        <h2 class="text-lg font-semibold">Versandarten</h2>
        <UButton
          to="/zahlung-und-versand"
          size="sm"
          variant="ghost"
          icon="i-lucide-circle-help"
        />
      </div>
      <URadioGroup
        v-model="selectedShippingMethodId"
        :items="selectableShippingMethods"
        variant="card"
      />
    </div>
  </div>
</template>
