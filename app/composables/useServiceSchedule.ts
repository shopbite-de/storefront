import type { ServiceSchedule } from "../../shared/domain";

/**
 * What decides when the restaurant serves: its time zone, opening hours
 * and holidays; `null` until hours and holidays are loaded (app.vue).
 */
export function useServiceSchedule() {
  const { openingHours } = useOpeningHours();
  const { holidays } = useHolidays();
  const { timeZone } = useShopConfig();

  const schedule = computed<ServiceSchedule | null>(() =>
    openingHours.value && holidays.value
      ? {
          timeZone: timeZone.value,
          openingHours: openingHours.value,
          holidays: holidays.value,
        }
      : null,
  );

  return { schedule };
}
