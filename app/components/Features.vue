<script setup lang="ts">
import type { PageFeatureProps } from '#ui/components/PageFeature.vue'

defineProps<{
  title: string
  description: string
  headline?: string|undefined
  features: PageFeatureProps[]
}>()
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
      :features="features"
      :headline="headline"
      class="relative overflow-hidden"
    >
      <div
        class="absolute rounded-full -left-10 top-10 size-[300px] z-10 bg-primary opacity-30 blur-[200px]"
      />
      <div
        class="absolute rounded-full -right-10 -bottom-10 size-[300px] z-10 bg-primary opacity-30 blur-[200px]"
      />
      <template #title>
        <MDC
          :value="title"
          class="*:leading-9"
        />
      </template>
    </UPageSection>
  </AnimatedSection>
</template>
