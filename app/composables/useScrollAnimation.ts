import { ref, onMounted, onBeforeUnmount, type Ref } from "vue";

export interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
}

/**
 * Reveal-on-scroll state for a section.
 *
 * The content is visible in the server-rendered HTML and on the client's
 * first render, so crawlers, no-JS visitors and slow devices see it, and
 * hydration matches (#250). Only after mount, and only for elements that
 * are not in the viewport yet, `isHidden` becomes true; the element is
 * revealed again when it scrolls into view. Users who prefer reduced
 * motion never get the hidden state.
 */
/**
 * Everything above the viewport counts as "in view": a section skipped by a
 * jump (anchor link, End key, restored scroll position) must not stay hidden.
 */
export const ABOVE_VIEWPORT_MARGIN = "100000px";

export function useScrollAnimation(options: ScrollAnimationOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = `${ABOVE_VIEWPORT_MARGIN} 0px -100px 0px`,
  } = options;

  const isHidden = ref(false);
  const elementRef: Ref<HTMLElement | null> = ref(null);
  let observer: IntersectionObserver | undefined;

  onMounted(() => {
    if (
      !elementRef.value ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Already in view on the first check: stays visible, no animation.
            isHidden.value = false;
            observer?.unobserve(entry.target);
          } else {
            isHidden.value = true;
          }
        });
      },
      {
        threshold,
        rootMargin,
      },
    );

    observer.observe(elementRef.value);
  });

  onBeforeUnmount(() => observer?.disconnect());

  return {
    isHidden,
    elementRef,
  };
}
