type BusinessHourLike = {
  /** 1 = Monday … 7 = Sunday */
  dayOfWeek?: number;
  openingTime?: string;
  closingTime?: string;
};

/** A run of consecutive weekdays with identical opening hours. */
export type OpeningHoursRow = {
  /** e.g. `Mo` or `Mi–Fr` */
  days: string;
  /** e.g. `["11:30–14:30", "17:30–23:00"]`; empty on closed days */
  intervals: string[];
};

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

const formatTime = (time: string) => time.slice(0, 5);

/**
 * Groups business hours into display rows: consecutive days (Monday to
 * Sunday) with the same intervals share a row. Returns an empty list if no
 * day has opening hours.
 */
export function groupOpeningHours(
  businessHours: BusinessHourLike[],
): OpeningHoursRow[] {
  const intervalsByDay = DAY_LABELS.map((_, index) =>
    businessHours
      .filter(
        (bh) => bh.dayOfWeek === index + 1 && bh.openingTime && bh.closingTime,
      )
      .sort((a, b) => a.openingTime!.localeCompare(b.openingTime!))
      .map(
        (bh) => `${formatTime(bh.openingTime!)}–${formatTime(bh.closingTime!)}`,
      ),
  );

  if (intervalsByDay.every((intervals) => intervals.length === 0)) return [];

  const rows: OpeningHoursRow[] = [];
  let firstDay = 0;

  for (let day = 1; day <= DAY_LABELS.length; day++) {
    const sameAsGroup =
      day < DAY_LABELS.length &&
      intervalsByDay[day]!.join() === intervalsByDay[firstDay]!.join();
    if (sameAsGroup) continue;

    const lastDay = day - 1;
    rows.push({
      days:
        firstDay === lastDay
          ? DAY_LABELS[firstDay]!
          : `${DAY_LABELS[firstDay]}–${DAY_LABELS[lastDay]}`,
      intervals: intervalsByDay[firstDay]!,
    });
    firstDay = day;
  }

  return rows;
}

/** `tel:` link for a displayed phone number, e.g. `+49 6104 71427`. */
export function toTelHref(telephone: string): string {
  return `tel:${telephone.replace(/[^\d+]/g, "")}`;
}
