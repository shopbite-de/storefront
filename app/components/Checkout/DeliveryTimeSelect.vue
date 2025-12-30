<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { useDeliveryTime } from "~/composables/useDeliveryTime";
import { isClosedHoliday } from "~/utils/holidays";

const props = defineProps<{
  modelValue?: string;
  valid?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string | null): void;
  (e: "update:valid", value: boolean): void;
}>();

const { deliveryTime } = useShopBiteConfig();

const selected = ref<string>(props.modelValue ?? "");
const now = ref<Date>(new Date());

function refreshCurrentTime(): void {
  now.value = new Date();
}

let timeUpdateInterval: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  timeUpdateInterval = globalThis.setInterval(refreshCurrentTime, 60_000);
});

onUnmounted(() => {
  if (timeUpdateInterval) {
    globalThis.clearInterval(timeUpdateInterval);
  }
});

const {
  minTime,
  maxTime,
  isClosedToday,
  helperText,
  clampTimeToInterval,
  isTimeWithinBounds,
  validate,
} = useDeliveryTime(now);

const validationError = computed<string | null>(() =>
  selected.value ? validate(selected.value) : null,
);

const isValid = computed<boolean>(() => {
  if (!selected.value) return false;
  if (isClosedHoliday(now.value)) return false;
  return validate(selected.value) === null;
});

const deliveryTimeInfo = computed(() => {
  return "Geschätzte Lieferzeit beträgt " + deliveryTime.value + " min.";
});

watch(
  isValid,
  (v) => {
    emit("update:valid", v);
  },
  { immediate: true },
);

watch(
  () => props.modelValue,
  (newValue) => {
    if (typeof newValue === "string" && newValue !== selected.value) {
      selected.value = newValue;
    }
  },
);

function roundToNext5MinInterval(timeString: string | null): string {
  if (!timeString) return "";
  const [hours, minutes] = timeString.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;
  const roundedMinutes = Math.ceil(totalMinutes / 5) * 5;
  const newHours = Math.floor(roundedMinutes / 60) % 24;
  const newMinutes = roundedMinutes % 60;
  return `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
}

// Move initialization to a proper place
watch(
  [minTime, maxTime],
  () => {
    if (!minTime.value || !maxTime.value) {
      if (selected.value) {
        selected.value = "";
        emit("update:modelValue", null);
      }
      return;
    }

    if (!selected.value) {
      selected.value = roundToNext5MinInterval(minTime.value);
      emit("update:modelValue", selected.value);
      return;
    }

    if (
      selected.value &&
      !isTimeWithinBounds(selected.value, minTime.value, maxTime.value)
    ) {
      const clampedTime = clampTimeToInterval(
        selected.value,
        minTime.value,
        maxTime.value,
        now.value,
      );
      if (clampedTime !== selected.value) {
        selected.value = clampedTime;
        emit("update:modelValue", clampedTime);
      }
    }
  },
  { immediate: true },
);

function handleTimeInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  selected.value = value;
  emit("update:modelValue", value || null);
}
</script>

<template>
  <div v-if="!isClosedHoliday(now)" class="flex flex-col gap-2 mt-4">
    <div class="flex flex-row items-center justify-between gap-4">
      <div>Wunschlieferung- oder Abholzeit ab:</div>
      <client-only>
        <input
          type="time"
          :min="minTime ?? undefined"
          :max="maxTime ?? undefined"
          :disabled="isClosedToday || isClosedHoliday(now)"
          :value="selected"
          step="300"
          class="border rounded px-2 py-1"
          @input="handleTimeInput"
        >
      </client-only>
    </div>
    <p v-if="validationError" class="text-sm text-red-600">
      {{ validationError }}
    </p>
    <p v-else class="text-sm text-gray-500">{{ helperText }}</p>
    <UBadge
      :label="deliveryTimeInfo"
      icon="i-lucide-clock"
      size="xl"
      color="neutral"
      variant="subtle"
    />
    <UBadge
      label="Lieferzeiten können zu Stoßzeiten variieren."
      icon="i-lucide-info"
      size="xl"
      color="warning"
      variant="subtle"
    />
  </div>
  <div v-else>
    <UBadge
      variant="subtle"
      class="w-full"
      icon="i-lucide-info"
      color="error"
      label="Geschlossen wegen Betriebsferien"
    />
  </div>
</template>
