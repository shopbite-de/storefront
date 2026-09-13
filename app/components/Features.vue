<script setup lang="ts">
import type { FeatureCardProps } from "~/components/Feature/Card.vue";

defineProps<{
  title: string;
  description: string;
  headline?: string | undefined;
  features: FeatureCardProps[];
}>();
</script>

<template>
  <AnimatedSection
    animation="fade-up"
    duration="duration-1000"
    delay="delay-100"
  >
    <UPageSection
      id="features"
      :description="description"
      :headline="headline"
      class="relative overflow-hidden"
    >
      <template #title>
        <MDC :value="title" class="*:leading-9" />
      </template>
      <div
        class="absolute rounded-full -left-10 top-10 size-[300px] -z-10 bg-primary opacity-30 blur-[200px]"
      />
      <div
        class="absolute rounded-full -right-10 -bottom-10 size-[300px] -z-10 bg-primary opacity-30 blur-[200px]"
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          v-for="(feature, index) in features"
          :key="index"
          v-bind="feature"
        />
      </div>
    </UPageSection>
  </AnimatedSection>
</template>
