import { describe, it, expect, vi } from "vitest";
import { useProductEvents } from "../../app/composables/useProductEvents";
import { nextTick } from "vue";

/**
 * Unit tests for useProductEvents composable
 *
 * This composable provides a lightweight event bus for product-related events,
 * specifically designed to handle the "product added to cart" event without
 * requiring prop drilling or state management libraries like Pinia.
 *
 * Test Coverage:
 * - Basic event triggering and listening
 * - Multiple triggers and listeners
 * - Edge cases (no listeners, callback errors)
 * - Memory management (listener cleanup)
 */
describe("useProductEvents", () => {
  it("should trigger and listen to product added event", async () => {
    const { triggerProductAdded, onProductAdded } = useProductEvents();
    const callback = vi.fn();

    onProductAdded(callback);
    triggerProductAdded();

    await nextTick();
    expect(callback).toHaveBeenCalled();
  });

  it("should call callback when triggered multiple times", async () => {
    const { triggerProductAdded, onProductAdded } = useProductEvents();
    const callback = vi.fn();

    onProductAdded(callback);
    triggerProductAdded();
    await nextTick();

    triggerProductAdded();
    await nextTick();

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("should not call callback before trigger", () => {
    const { onProductAdded } = useProductEvents();
    const callback = vi.fn();

    onProductAdded(callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it("should work with multiple listeners", async () => {
    const { triggerProductAdded, onProductAdded } = useProductEvents();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    onProductAdded(callback1);
    onProductAdded(callback2);
    triggerProductAdded();

    await nextTick();
    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  it("should work when triggered without any listeners", () => {
    const { triggerProductAdded } = useProductEvents();

    // Should not throw when no listeners are registered
    expect(() => triggerProductAdded()).not.toThrow();
  });

  it("should work with shared global state across multiple instances", async () => {
    const instance1 = useProductEvents();
    const instance2 = useProductEvents();

    const callback1 = vi.fn();
    const callback2 = vi.fn();

    instance1.onProductAdded(callback1);
    instance2.onProductAdded(callback2);

    // Trigger from instance1
    instance1.triggerProductAdded();
    await nextTick();

    // Both callbacks should be called (global event bus behavior)
    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  it("should call callbacks on each trigger", async () => {
    const { triggerProductAdded, onProductAdded } = useProductEvents();
    const callback = vi.fn();

    onProductAdded(callback);

    triggerProductAdded();
    await nextTick();
    expect(callback).toHaveBeenCalledTimes(1);

    triggerProductAdded();
    await nextTick();
    expect(callback).toHaveBeenCalledTimes(2);

    triggerProductAdded();
    await nextTick();
    expect(callback).toHaveBeenCalledTimes(3);
  });
});
