<script setup lang="ts">
import { useScrollAnimation } from '~/composables/useScrollAnimation'

interface Props {
  animation?:
    | 'fade-up'
    | 'fade-down'
    | 'fade-left'
    | 'fade-right'
    | 'fade'
    | 'scale'
  duration?:
    | 'duration-500'
    | 'duration-700'
    | 'duration-1000'
    | 'duration-1500'
  delay?: string
  threshold?: number
  rootMargin?: string
}

const props = withDefaults(defineProps<Props>(), {
  animation: 'fade-up',
  duration: 'duration-1000',
  delay: 'delay-0',
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
})

const { isVisible, elementRef } = useScrollAnimation({
  threshold: props.threshold,
  rootMargin: props.rootMargin
})

const animationClasses = {
  'fade-up': {
    initial: 'opacity-0 translate-y-20',
    final: 'opacity-100 translate-y-0'
  },
  'fade-down': {
    initial: 'opacity-0 -translate-y-20',
    final: 'opacity-100 translate-y-0'
  },
  'fade-left': {
    initial: 'opacity-0 translate-x-20',
    final: 'opacity-100 translate-x-0'
  },
  'fade-right': {
    initial: 'opacity-0 -translate-x-20',
    final: 'opacity-100 translate-x-0'
  },
  'fade': {
    initial: 'opacity-0',
    final: 'opacity-100'
  },
  'scale': {
    initial: 'opacity-0 scale-95',
    final: 'opacity-100 scale-100'
  }
}

const currentAnimation = animationClasses[props.animation]
</script>

<template>
  <div
    ref="elementRef"
    class="transition-all ease-out"
    :class="[
      duration,
      delay,
      isVisible ? currentAnimation.final : currentAnimation.initial
    ]"
  >
    <slot />
  </div>
</template>
