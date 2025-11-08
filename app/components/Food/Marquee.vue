<script setup lang="ts">
import type { MarqueeItem } from "~/components/Food/MarqueeItem.vue";

defineProps<{
  title: string;
  description?: string | undefined;
  headline?: string | undefined;
  items: MarqueeItem[];
}>();
</script>

<template>
  <AnimatedSection
    animation="fade-up"
    duration="duration-1000"
    delay="delay-100"
  >
    <UPageSection
      id="food"
      :title="title"
      :description="description"
      :headline="headline"
      :ui="{ container: 'max-w-full' }"
    >
      <UMarquee :repeat="6" pause-on-hover :overlay="true">
        <FoodMarqueeItem
          v-for="item in items"
          :key="item.productId"
          :product-id="item.productId"
          :image="item.image"
        />
      </UMarquee>
    </UPageSection>
  </AnimatedSection>
</template>
