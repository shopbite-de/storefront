import { useIntervalFn } from "@vueuse/core";
import type {
  NextOpeningWords,
  StoreStatusText,
} from "../utils/restaurantTime";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * Whether the restaurant is open right now, with the closing time of the
 * current span or the next opening, in the restaurant's time zone. `null`
 * until opening hours and holidays are loaded. The clock starts when the
 * component is mounted, so the status is also `null` on the server and
 * during hydration: the home page prefetches the hours on the server, and
 * a status rendered there could change by hydration (#365).
 */
export function useStoreStatus() {
  const { schedule } = useServiceSchedule();
  const { t } = useI18n();
  const words = computed<NextOpeningWords>(() => ({
    weekdays: WEEKDAYS.map((day) => t(`common.weekdays.${day}`)),
    today: (time) => t("common.storeStatus.nextOpening.today", { time }),
    tomorrow: (time) => t("common.storeStatus.nextOpening.tomorrow", { time }),
    later: (parts) => t("common.storeStatus.nextOpening.later", parts),
  }));

  const now = ref<Date | null>(null);
  const tick = () => {
    now.value = new Date();
  };
  onMounted(tick);
  useIntervalFn(tick, 60_000);

  const status = computed<StoreStatusText | null>(() =>
    now.value && schedule.value
      ? storeStatusAt(now.value, schedule.value, words.value)
      : null,
  );

  return { status };
}
