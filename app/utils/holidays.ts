export function isClosedHoliday(date: Date): boolean {
  // Format date as YYYY-MM-DD for comparison
  const formattedDate = formatDateYYYYMMDD(date);

  // List of holidays (YYYY-MM-DD format)
  const holidays = [
    "2025-07-21",
    "2025-07-22",
    "2025-07-23",
    "2025-07-24",
    "2025-07-25",
    "2025-07-26",
    "2025-07-27",
    "2025-07-28",
    "2025-07-29",
    "2025-07-30",
    "2025-07-31",
    "2025-08-01",
    "2025-08-02",
    "2025-08-03",
    "2025-08-04",
    "2025-08-05",
    "2025-08-06",
    "2025-08-07",
    "2025-08-08",
    "2025-08-09",
  ];

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
