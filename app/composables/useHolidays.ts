export function useHolidays() {
  const { data, pending, refresh } = useAsyncData(
    "holidays",
    () =>
      $fetch<Array<{ start?: string; end?: string }>>("/api/shopbite/holidays"),
    { immediate: false },
  );

  /**
   * Checks if a given date (default today) is a closed holiday.
   * Returns undefined if holiday data is not yet loaded.
   */
  const isClosedHoliday = (date?: Date): boolean | undefined => {
    if (!data.value) return undefined;
    const checkDate = date ?? new Date();
    const formattedDate = formatDateYYYYMMDD(checkDate);

    return data.value.some((holiday) => {
      if (!holiday.start || !holiday.end) return false;
      const start = formatDateYYYYMMDD(new Date(holiday.start));
      const end = formatDateYYYYMMDD(new Date(holiday.end));
      return formattedDate >= start && formattedDate <= end;
    });
  };

  return {
    holidays: data,
    isClosedHoliday,
    isLoading: pending,
    refresh,
  };
}

function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
