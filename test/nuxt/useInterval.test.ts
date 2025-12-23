import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useInterval } from "../../app/composables/useInterval";
import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";

describe("useInterval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should start interval on mount and call callback", async () => {
    const callback = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        useInterval(callback, 1000);
        return {};
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it("should clear interval on unmount", () => {
    const callback = vi.fn();
    const TestComponent = defineComponent({
      setup() {
        useInterval(callback, 1000);
        return {};
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    wrapper.unmount();

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1); // Should not have increased
  });
});
