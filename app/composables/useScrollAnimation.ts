import { ref, onMounted, type Ref } from 'vue'

export interface ScrollAnimationOptions {
  threshold?: number
  rootMargin?: string
}

export function useScrollAnimation(options: ScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px 0px -100px 0px' } = options

  const isVisible = ref(false)
  const elementRef: Ref<HTMLElement | null> = ref(null)

  onMounted(() => {
    if (!elementRef.value) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold,
        rootMargin
      }
    )

    observer.observe(elementRef.value)
  })

  return {
    isVisible,
    elementRef
  }
}
