// utils/storeHours.ts
export function isStoreOpen(date: Date = new Date()): boolean {
  if (isClosedHoliday(date)) return false;

  const intervals = getServiceIntervals(date);
  if (intervals.length === 0) return false;
  return intervals.some(({ start, end }) => date >= start && date <= end);
}
