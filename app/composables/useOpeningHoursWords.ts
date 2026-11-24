import type { OpeningHoursWords } from "../utils/openingHours";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * The words of the opening hours in the shop's locale (ADR 0002) for the
 * pure helpers of `app/utils/openingHours.ts`.
 */
export function useOpeningHoursWords(): ComputedRef<OpeningHoursWords> {
  const { t } = useI18n();
  return computed(() => ({
    days: WEEKDAYS.map((day) => t(`common.hours.days.${day}`)),
    today: (intervals: string) => t("common.hours.today", { intervals }),
    closedToday: t("common.hours.closedToday"),
    and: t("common.hours.and"),
  }));
}
