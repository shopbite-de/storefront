import { useIntervalFn } from "@vueuse/core";

export type StoreStatus =
  | { open: true; closesAt: string }
  | { open: false; nextOpening: string | null };

const formatTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

/**
 * Whether the store is open right now, with the closing time of the current
 * interval or the next opening. `null` until business hours and holidays are
 * loaded. Client only: the browser's clock and time zone decide, the server's
 * would not match the shop's (#275).
 */
export function useStoreStatus() {
  const {
    businessHours,
    getServiceIntervals,
    isStoreOpen,
    getNextOpeningTime,
  } = useBusinessHours();
  const { holidays, isClosedHoliday } = useHolidays();

  const now = ref(new Date());
  useIntervalFn(() => {
    now.value = new Date();
  }, 60_000);

  const status = computed<StoreStatus | null>(() => {
    if (!businessHours.value || !holidays.value) return null;

    const current = now.value;
    if (isStoreOpen(current, isClosedHoliday)) {
      const interval = getServiceIntervals(current).find(
        ({ start, end }) => current >= start && current <= end,
      );
      return { open: true, closesAt: formatTime(interval?.end ?? current) };
    }

    return {
      open: false,
      nextOpening: getNextOpeningTime(now, isClosedHoliday),
    };
  });

  return { status };
}
