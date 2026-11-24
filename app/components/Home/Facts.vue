<script setup lang="ts">
/** One entry of `features.features` in content/index.yml. */
export type FeatureCardProps = {
  title: string;
  description: string;
  icon?: string;
  kind?: "hours" | "delivery" | "pickup" | "reservation";
  lead?: string;
  link?: { label: string; to: string };
};

/**
 * Facts row under the hero of the presets (#444): the `features` of
 * content/index.yml as four columns with a strong top rule. Today's hours
 * and the delivery and pickup times are live, like on the feature cards
 * (#332, shopbite#6).
 */
const props = defineProps<{ features: FeatureCardProps[] }>();

const { openingHours } = useOpeningHours();
const { timeZone } = useShopConfig();
const { deliveryTime, pickupTime } = useShippingMethods();
const hoursWords = useOpeningHoursWords();
const { t } = useI18n();

const items = computed(() =>
  props.features.map((feature) => {
    let lead = feature.lead ?? "";
    // today in the restaurant's time zone; rendered in the browser only
    if (feature.kind === "hours" && openingHours.value) {
      lead = formatTodayHours(
        openingHours.value,
        new Date(),
        timeZone.value,
        hoursWords.value,
      );
    }
    // lead times of the delivery and pickup methods (shopbite#6)
    if (feature.kind === "delivery" && deliveryTime.value !== null) {
      lead = t("common.homeFacts.deliveryLead", {
        minutes: deliveryTime.value,
      });
    }
    if (feature.kind === "pickup" && pickupTime.value !== null) {
      lead = t("common.homeFacts.pickupLead", { minutes: pickupTime.value });
    }
    return { ...feature, lead };
  }),
);
</script>

<template>
  <section
    :aria-label="$t('common.homeFacts.label')"
    class="mx-auto w-full max-w-(--sb-container) px-4 pb-16 sm:px-6 lg:px-8 sm:pb-24"
  >
    <ul
      class="grid grid-cols-1 gap-x-8 gap-y-6 font-body text-sb-ink sm:grid-cols-2 lg:grid-cols-4"
    >
      <li
        v-for="item in items"
        :key="item.title"
        class="flex flex-col gap-1.5 border-t-[1.5px] border-sb-ink pt-4"
      >
        <h2 class="font-body text-[15px] font-bold">{{ item.title }}</h2>
        <ClientOnly v-if="item.kind === 'hours'">
          <p v-if="item.lead" class="text-[14.5px] font-semibold">
            {{ item.lead }}
          </p>
        </ClientOnly>
        <p v-else-if="item.lead" class="text-[14.5px] font-semibold">
          {{ item.lead }}
        </p>
        <p class="text-[14.5px] leading-normal text-sb-ink-muted">
          {{ item.description }}
        </p>
        <NuxtLink
          v-if="item.link"
          :to="item.link.to"
          class="mt-1 inline-flex min-h-11 items-center self-start text-[14.5px] font-bold text-sb-primary-ink underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-sb-focus"
        >
          {{ item.link.label }}
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
