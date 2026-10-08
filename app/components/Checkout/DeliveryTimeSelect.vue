<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { useDeliveryTime } from "~/composables/useDeliveryTime";
import { useHolidays } from "~/composables/useHolidays";

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

const { isClosedHoliday } = useHolidays();
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
  if (isClosedHoliday(now.value) === true) return false;
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

function roundToNext5MinInterval(timeString: string | null): string {
  if (!timeString) return "";
  const parts = timeString.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
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
        <strong class="block"
          >Öffnungszeiten konnten nicht geladen werden</strong
        >
        Ohne Öffnungszeiten können wir keine Lieferzeit anbieten.
      </span>
      <SbButton variant="secondary" @click="retryOpeningHours"
        >Erneut versuchen</SbButton
      >
    </div>
    <p
      v-else-if="isOpeningHoursLoaded && isClosedHoliday(now) === true"
      role="status"
      class="rounded-sb-control bg-sb-muted p-4 font-semibold"
    >
      Wir haben Betriebsferien und nehmen gerade keine Bestellungen an.
    </p>
    <template v-else-if="isOpeningHoursLoaded">
      <SbField
        id="delivery-time"
        v-slot="{ id, describedBy, invalid }"
        label="Wunschzeit für Lieferung oder Abholung, frühestens"
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
      <p class="text-sm text-sb-ink-muted">
        Lieferzeit ca. {{ deliveryTime }} Minuten, zu Stoßzeiten kann es etwas
        länger dauern.
      </p>
    </template>
    <p v-else class="text-sm text-sb-ink-muted" aria-busy="true">
      Öffnungszeiten werden geladen …
    </p>
  </div>
</template>
