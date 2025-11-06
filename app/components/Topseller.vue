<script setup lang="ts">
import type { ButtonProps } from "#ui/components/Button.vue";

const { loadTopSellers } = useTopSellers();

const topSellers = await loadTopSellers();

const links = ref<ButtonProps[]>([
  {
    label: "Zur Speisekarte",
    to: "/speisekarte",
    color: "primary",
    variant: "subtle",
    trailingIcon: "i-lucide-arrow-right",
  },
]);
</script>

<template>
  <div v-if="topSellers.length > 0">
    <AnimatedSection
      animation="fade-up"
      duration="duration-1000"
      delay="delay-100"
    >
      <UPageSection
        headline="Bestseller"
        title="Am meisten bestellt"
        :links="links"
      >
        <UPageGrid>
          <ProductCard
            v-for="product in topSellers"
            :key="product.productNumber"
            :product="product"
            :with-favorite-button="false"
            :with-add-to-cart-button="false"
          />
        </UPageGrid>
      </UPageSection>
    </AnimatedSection>
  </div>
</template>
