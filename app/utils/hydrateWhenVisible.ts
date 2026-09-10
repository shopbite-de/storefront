import { defineAsyncComponent, hydrateOnVisible, type Component } from "vue";

/**
 * Wraps a component so that its server-rendered markup is kept and hydrated
 * only once it comes within `margin` of the viewport (#314).
 *
 * Unlike `<LazyX hydrate-on-visible>`, the component stays in the chunk of
 * the importer: nothing extra is requested before the first instance can
 * hydrate. The margin should exceed the reveal margin of `AnimatedSection`
 * (100px) so the scroll animation still runs after hydration.
 */
export function hydrateWhenVisible<T extends Component>(
  component: T,
  margin = "600px",
): T {
  return defineAsyncComponent({
    loader: () => Promise.resolve(component),
    hydrate: hydrateOnVisible({ rootMargin: `${margin} 0px` }),
  }) as T;
}
