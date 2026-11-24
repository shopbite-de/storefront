<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";

const props = defineProps<{
  modelValue?: string;
  valid?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string | null): void;
  (e: "update:valid", value: boolean): void;
}>();

// Lead time and wording follow the selected shipping method (shopbite#6).
const { fulfillment, leadTime } = useShippingLeadTime();
const { t } = useI18n();
const wording = (key: string, params: Record<string, number> = {}) =>
  t(`order.fulfillment.${fulfillment.value}.${key}`, params);

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

// Times in the restaurant's time zone; a window running past midnight has
// min > max, which the time input allows (reversed range).
const {
  minTime,
  maxTime,
  isClosedToday,
  isHoliday,
  helperText,
  firstSlotTime,
  isWithinWindow,
  slotFor,
  validate,
} = useDeliveryTime(now);

const {
  isLoaded: isOpeningHoursLoaded,
  hasFailed: hasOpeningHoursFailed,
  retry: retryOpeningHours,
} = useOpeningHoursData();

const validationError = computed<string | null>(() =>
  selected.value ? validate(selected.value) : null,
);

const isValid = computed<boolean>(() => {
  if (!selected.value) return false;
  if (isHoliday.value === true) return false;
  return validate(selected.value) === null;
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

// Whether the time is the one filled in here (earliest slot), not one the
// guest chose: it follows the earliest slot, e.g. to an earlier one after a
// switch from delivery to pickup (shopbite#6).
const isPrefilled = ref(false);

function setSelected(time: string): void {
  if (time === selected.value) return;
  selected.value = time;
  emit("update:modelValue", time);
}

function clearSelected(): void {
  if (!selected.value) return;
  selected.value = "";
  emit("update:modelValue", null);
}

watch(
  [minTime, maxTime],
  () => {
    if (!minTime.value || !maxTime.value || !firstSlotTime.value) {
      clearSelected();
      return;
    }

    if (!selected.value || isPrefilled.value) {
      setSelected(firstSlotTime.value);
      isPrefilled.value = true;
      return;
    }

    if (!isWithinWindow(selected.value)) {
      const slot = slotFor(selected.value);
      if (slot) setSelected(slot);
      else clearSelected();
    }
  },
  { immediate: true },
);

function handleTimeInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  isPrefilled.value = false;
  selected.value = value;
  emit("update:modelValue", value || null);
}

// Presets: the base components and plain text instead of badges (#443).
</script>

<template>
  <div class="flex flex-col gap-3 font-body text-sb-ink">
    <div
      v-if="hasOpeningHoursFailed"
      role="alert"
      class="flex flex-col items-start gap-3 rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
    >
      <span>
        <strong class="block">{{ $t("order.shared.hoursFailed") }}</strong>
        {{ wording("noTimeWithoutHours") }}
      </span>
      <SbButton variant="secondary" @click="retryOpeningHours">{{
        $t("order.deliveryTime.retry")
      }}</SbButton>
    </div>
    <p
      v-else-if="isOpeningHoursLoaded && isHoliday === true"
      role="status"
      class="rounded-sb-control bg-sb-muted p-4 font-semibold"
    >
      {{ $t("order.deliveryTime.holidayNotice") }}
    </p>
    <template v-else-if="isOpeningHoursLoaded">
      <SbField
        id="delivery-time"
        v-slot="{ id, describedBy, invalid }"
        :label="wording('wishedTime')"
        :hint="validationError ? undefined : helperText"
        :error="validationError ?? undefined"
      >
        <ClientOnly>
          <input
            :id="id"
            type="time"
            :min="minTime ?? undefined"
            :max="maxTime ?? undefined"
            step="300"
            :value="selected"
            :disabled="isClosedToday"
            :aria-describedby="describedBy"
            :aria-invalid="invalid || undefined"
            class="min-h-[50px] w-full max-w-48 rounded-sb-control border-[1.5px] border-sb-control bg-sb-surface px-3.5 font-body text-lg font-semibold text-sb-ink tabular-nums focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sb-focus disabled:opacity-60 aria-invalid:border-sb-danger"
            @input="handleTimeInput"
          />
        </ClientOnly>
      </SbField>
      <p v-if="leadTime !== null" class="text-sm text-sb-ink-muted">
        {{ wording("leadTimeHint", { minutes: leadTime }) }}
      </p>
    </template>
    <p v-else class="text-sm text-sb-ink-muted" aria-busy="true">
      {{ $t("order.deliveryTime.hoursLoading") }}
    </p>
  </div>
</template>
