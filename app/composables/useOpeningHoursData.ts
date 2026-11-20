/** Delays before the browser requests opening hours or holidays again. */
export const OPENING_HOURS_RETRY_DELAYS = [1000, 3000] as const;

/**
 * Load state of opening hours and holidays, which app.vue fetches after
 * mounting (#349, #355). `hasFailed` once a request failed after its retries
 * and no attempt is running; `retry()` requests the missing data again.
 *
 * `hasFailed` stays `false` until the calling component is mounted: an error
 * from a server prefetch (footer) would otherwise render differently on the
 * server, where the checkout was rendered before it, and at hydration.
 */
export function useOpeningHoursData() {
  const {
    openingHours,
    status: openingHoursStatus,
    refresh: refreshOpeningHours,
  } = useOpeningHours();
  const {
    holidays,
    status: holidaysStatus,
    refresh: refreshHolidays,
  } = useHolidays();

  const isMounted = ref(false);
  onMounted(() => {
    isMounted.value = true;
  });

  const isLoaded = computed(() =>
    Boolean(openingHours.value && holidays.value),
  );

  const hasFailed = computed(() => {
    if (!isMounted.value || isLoaded.value) return false;
    const missing = [
      openingHours.value ? null : openingHoursStatus.value,
      holidays.value ? null : holidaysStatus.value,
    ].filter((status) => status !== null);
    return missing.includes("error") && !missing.includes("pending");
  });

  const isLoading = computed(() => !isLoaded.value && !hasFailed.value);

  async function retry(): Promise<void> {
    await Promise.all([
      openingHours.value ? undefined : refreshOpeningHours(),
      holidays.value ? undefined : refreshHolidays(),
    ]);
  }

  return { isLoaded, isLoading, hasFailed, retry };
}
