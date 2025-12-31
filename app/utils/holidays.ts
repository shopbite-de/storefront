export function isClosedHoliday(date?: Date): boolean {
  // Use provided date or current date
  const checkDate = date ?? new Date();
  // Format date as YYYY-MM-DD for comparison
  const formattedDate = formatDateYYYYMMDD(checkDate);

  // List of holidays (YYYY-MM-DD format)
  const holidays = ["2025-12-31", "2026-01-01"];

  return holidays.includes(formattedDate);
}

/**
 * Formats a date as YYYY-MM-DD
 * @param date The date to format
 * @returns The formatted date string
 */
function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
