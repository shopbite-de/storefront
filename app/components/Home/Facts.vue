<script setup lang="ts">
/** One entry of `features.features` in content/index.yml. */
export type FeatureCardProps = {
  title: string;
  description: string;
  icon?: string;
  kind?: "hours" | "delivery" | "reservation";
  lead?: string;
  link?: { label: string; to: string };
};

/**
 * Facts row under the hero of the presets (#444): the `features` of
 * content/index.yml as four columns with a strong top rule. Today's hours
 * and the delivery time are live, like on the feature cards (#332).
 */
const props = defineProps<{ features: FeatureCardProps[] }>();

const { businessHours } = useBusinessHours();
const { deliveryTime } = useShopBiteConfig();

const items = computed(() =>
  props.features.map((feature) => {
    let lead = feature.lead ?? "";
    if (feature.kind === "hours" && businessHours.value) {
      lead = formatTodayHours(businessHours.value, new Date());
    }
    if (feature.kind === "delivery") {
      lead = `In ca. ${deliveryTime.value} Minuten bei Ihnen`;
    }
    return { ...feature, lead };
  }),
);
</script>

<template>
  <section
    aria-label="Auf einen Blick"
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
