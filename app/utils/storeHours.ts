// utils/storeHours.ts
import { getServiceIntervals } from "~/utils/businessHours";

export function isStoreOpen(date: Date = new Date()): boolean {
  const intervals = getServiceIntervals(date);
  if (intervals.length === 0) return false;
  return intervals.some(({ start, end }) => date >= start && date <= end);
}
