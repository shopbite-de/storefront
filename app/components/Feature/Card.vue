<script setup lang="ts">
// Information card on the home page (#332): tinted icon, category label, a
// bold lead line, detail text and an optional action. `kind` fills the lead
// with live data; both live parts render on the client only, like the
// footer's store status (#275), with their height reserved.
export type FeatureCardProps = {
  title: string;
  description: string;
  icon?: string;
  kind?: "hours" | "delivery" | "reservation";
  lead?: string;
  link?: { label: string; to: string };
};

const props = defineProps<FeatureCardProps>();

const { businessHours } = useBusinessHours();
const { status } = useStoreStatus();
const { deliveryTime } = useShopBiteConfig();

const isLive = computed(
  () => props.kind === "hours" || props.kind === "delivery",
);

const lead = computed(() => {
  if (props.kind === "hours") {
    return businessHours.value
      ? formatTodayHours(businessHours.value, new Date())
      : "";
  }
  if (props.kind === "delivery") {
    return `In ca. ${deliveryTime.value} Minuten bei dir`;
  }
  return props.lead ?? "";
});

const statusLabel = computed(() => {
  if (props.kind !== "hours" || !status.value) return "";
  if (status.value.open) return `Geöffnet bis ${status.value.closesAt}`;
  return status.value.nextOpening
    ? `Öffnet ${status.value.nextOpening}`
    : "Geschlossen";
});

const isCallLink = computed(() => props.link?.to.startsWith("tel:") ?? false);
</script>

<template>
  <div
    class="flex h-full flex-col gap-3 rounded-2xl bg-default p-5 shadow-md ring ring-default"
  >
    <div class="flex items-center justify-between gap-3">
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <UIcon v-if="icon" :name="icon" class="size-6" />
      </span>
      <ClientOnly v-if="kind === 'hours'">
        <span
          v-if="statusLabel"
          class="inline-flex items-center gap-1.5 text-sm font-semibold"
          :class="status?.open ? 'text-success' : 'text-muted'"
          role="status"
        >
          <span
            class="size-2 rounded-full"
            :class="status?.open ? 'bg-success' : 'bg-dimmed'"
            aria-hidden="true"
          />
          {{ statusLabel }}
        </span>
        <template #fallback>
          <span class="h-5" aria-hidden="true" />
        </template>
      </ClientOnly>
    </div>

    <div class="flex flex-col gap-1">
      <span class="text-xs font-semibold tracking-wider text-muted uppercase">
        {{ title }}
      </span>
      <ClientOnly v-if="isLive">
        <span class="text-lg leading-6 font-bold text-highlighted">
          {{ lead }}
        </span>
        <template #fallback>
          <span class="block h-6" aria-hidden="true" />
        </template>
      </ClientOnly>
      <span
        v-else-if="lead"
        class="text-lg leading-6 font-bold text-highlighted"
      >
        {{ lead }}
      </span>
      <p class="text-sm text-default">{{ description }}</p>
    </div>

    <div v-if="link" class="mt-auto pt-1">
      <UButton
        v-if="isCallLink"
        :label="link.label"
        :to="link.to"
        icon="i-lucide-phone"
        variant="subtle"
        size="lg"
        class="justify-center"
        block
      />
      <UButton
        v-else
        :label="link.label"
        :to="link.to"
        variant="link"
        trailing-icon="i-lucide-arrow-right"
        class="px-0"
      />
    </div>
  </div>
</template>
