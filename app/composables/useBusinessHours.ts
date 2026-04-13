import type { Ref } from "vue";
import { setTime } from "~/utils/time";

export type ServiceInterval = { start: Date; end: Date };

export function useBusinessHours() {
  const { data, pending, refresh } = useAsyncData(
    "business-hours",
    () =>
      $fetch<
        Array<{
          dayOfWeek?: number;
          openingTime?: string;
          closingTime?: string;
        }>
      >("/api/shopbite/business-hours"),
    { immediate: false },
  );

  const getServiceIntervals = (date: Date): Array<ServiceInterval> => {
    if (!data.value) return [];

    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const dayBusinessHours = data.value.filter(
      (bh) => bh.dayOfWeek === dayOfWeek,
    );

    return dayBusinessHours
      .map((bh) => {
        if (!bh.openingTime || !bh.closingTime) return null;
        const startParts = bh.openingTime.split(":").map(Number);
        const endParts = bh.closingTime.split(":").map(Number);
        const startH = startParts[0] ?? 0;
        const startM = startParts[1] ?? 0;
        const endH = endParts[0] ?? 0;
        const endM = endParts[1] ?? 0;

        return {
          start: setTime(date, startH, startM),
          end: setTime(date, endH, endM),
        };
      })
      .sort((a, b) => {
        if (!a || !b) return 0;
        return a.start.getTime() - b.start.getTime();
      })
      .filter((interval): interval is ServiceInterval => interval !== null);
  };

  const getEarliestSelectableTime = (
    currentTime: Date,
    currentDeliveryTime: number | null,
  ): Date => {
    const earliest = new Date(currentTime);
    earliest.setMinutes(earliest.getMinutes() + (currentDeliveryTime ?? 30));
    earliest.setSeconds(0, 0);
    return earliest;
  };

  const findActiveInterval = (
    currentTime: Date,
    currentDeliveryTime: number | null,
  ): ServiceInterval | null => {
    const intervals = getServiceIntervals(currentTime);
    const earliest = getEarliestSelectableTime(
      currentTime,
      currentDeliveryTime ?? 30,
    );

    if (intervals.length === 0) return null;

    const current = intervals.find(
      (interval) => earliest >= interval.start && earliest <= interval.end,
    );
    if (current) return current;

    return intervals.find((interval) => interval.start > earliest) ?? null;
  };

  const getNextOpeningTime = (
    now: Ref<Date>,
    isClosedHoliday: (date: Date) => boolean | undefined,
  ): string | null => {
    const currentDate = now.value;
    const isHoliday = isClosedHoliday(currentDate);

    if (isHoliday === undefined) return null;

    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() + i);
      checkDate.setHours(12, 0, 0, 0);

      if (isClosedHoliday(checkDate) === true) continue;

      const intervals = getServiceIntervals(checkDate);
      if (intervals.length === 0) continue;

      if (i === 0) {
        for (const interval of intervals) {
          if (interval.start.getTime() > currentDate.getTime()) {
            const hours = interval.start.getHours().toString().padStart(2, "0");
            const minutes = interval.start
              .getMinutes()
              .toString()
              .padStart(2, "0");
            return `${hours}:${minutes} Uhr`;
          }
        }
        continue;
      }

      const nextOpen = intervals[0]!.start;
      const day = nextOpen.getDate().toString().padStart(2, "0");
      const month = (nextOpen.getMonth() + 1).toString().padStart(2, "0");
      const dayName = [
        "Sonntag",
        "Montag",
        "Dienstag",
        "Mittwoch",
        "Donnerstag",
        "Freitag",
        "Samstag",
      ][nextOpen.getDay()];
      const hours = nextOpen.getHours().toString().padStart(2, "0");
      const minutes = nextOpen.getMinutes().toString().padStart(2, "0");

      if (i === 1) {
        return `morgen um ${hours}:${minutes} Uhr`;
      }
      return `${dayName}, ${day}.${month}. um ${hours}:${minutes} Uhr`;
    }

    return null;
  };

  const isStoreOpen = (
    date: Date = new Date(),
    isClosedHoliday: (date: Date) => boolean | undefined,
  ): boolean => {
    if (isClosedHoliday(date) === true) return false;

    const intervals = getServiceIntervals(date);
    if (intervals.length === 0) return false;
    return intervals.some(({ start, end }) => date >= start && date <= end);
  };

  return {
    businessHours: data,
    isLoading: pending,
    refresh,
    isStoreOpen,
    getServiceIntervals,
    getEarliestSelectableTime,
    findActiveInterval,
    getNextOpeningTime,
  };
}
