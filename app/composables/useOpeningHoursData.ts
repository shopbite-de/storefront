/** Delays before the browser requests business hours or holidays again. */
export const OPENING_HOURS_RETRY_DELAYS = [1000, 3000] as const;

/**
 * Load state of business hours and holidays, which app.vue fetches after
 * mounting (#349, #355). `hasFailed` once a request failed after its retries
 * and no attempt is running; `retry()` requests the missing data again.
 *
 * `hasFailed` stays `false` until the calling component is mounted: an error
 * from a server prefetch (footer) would otherwise render differently on the
 * server, where the checkout was rendered before it, and at hydration.
 */
export function useOpeningHoursData() {
  const {
    businessHours,
    status: businessHoursStatus,
    refresh: refreshBusinessHours,
  } = useBusinessHours();
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
    Boolean(businessHours.value && holidays.value),
  );

  const hasFailed = computed(() => {
    if (!isMounted.value || isLoaded.value) return false;
    const missing = [
      businessHours.value ? null : businessHoursStatus.value,
      holidays.value ? null : holidaysStatus.value,
    ].filter((status) => status !== null);
    return missing.includes("error") && !missing.includes("pending");
  });

  const isLoading = computed(() => !isLoaded.value && !hasFailed.value);

  async function retry(): Promise<void> {
    await Promise.all([
      businessHours.value ? undefined : refreshBusinessHours(),
      holidays.value ? undefined : refreshHolidays(),
    ]);
  }

  return { isLoaded, isLoading, hasFailed, retry };
}
