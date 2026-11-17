import { useShopwareContext } from "#imports";
import type { Schemas } from "#shopware";

export const HOLIDAYS_KEY = "holidays";

type ApiClient = ReturnType<typeof useShopwareContext>["apiClient"];

/**
 * Closing days: from the server's cache (`/api/shopbite/holidays`,
 * `cacheTtl.holidays`) for server-side rendering, from Shopware in the
 * browser, where app.vue reloads them after hydration (useLiveShopData).
 * Retried in the browser only (#355).
 */
export async function loadHolidays(
  apiClient: ApiClient,
  fromServerCache: boolean,
  retryDelays: readonly number[] = OPENING_HOURS_RETRY_DELAYS,
): Promise<Schemas["HolidayStruct"]["holidays"]> {
  if (fromServerCache) {
    const cached = await $fetch<Schemas["HolidayStruct"]>(
      "/api/shopbite/holidays",
    );
    return cached.holidays;
  }
  const response = await withRetries(
    () => apiClient.invoke("shopbite.holiday.get get /shopbite/holiday"),
    retryDelays,
  );
  return response.data.holidays;
}

export function useHolidays() {
  const { apiClient } = useShopwareContext();

  const { data, pending, status, refresh } = useAsyncData(
    HOLIDAYS_KEY,
    () => loadHolidays(apiClient, import.meta.server),
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
    status,
    refresh,
  };
}

function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
