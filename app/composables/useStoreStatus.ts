import { useIntervalFn } from "@vueuse/core";
import type { StoreStatus } from "../utils/restaurantTime";

/**
 * Whether the restaurant is open right now, with the closing time of the
 * current span or the next opening, in the restaurant's time zone. `null`
 * until opening hours and holidays are loaded. The clock starts when the
 * component is mounted, so the status is also `null` on the server and
 * during hydration: the home page prefetches the hours on the server, and
 * a status rendered there could change by hydration (#365).
 */
export function useStoreStatus() {
  const { schedule } = useServiceSchedule();

  const now = ref<Date | null>(null);
  const tick = () => {
    now.value = new Date();
  };
  onMounted(tick);
  useIntervalFn(tick, 60_000);

  const status = computed<StoreStatus | null>(() =>
    now.value && schedule.value
      ? storeStatusAt(now.value, schedule.value)
      : null,
  );

  return { status };
}
