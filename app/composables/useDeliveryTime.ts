import { computed, type Ref } from "vue";
import type { WishedTimeWindow } from "../utils/restaurantTime";

/**
 * The wished time choice of the checkout ("Wann?"): the window in which
 * the guest can choose a time now, in the restaurant's time zone, after the
 * lead time of the selected shipping method (shopbite#6, 30 minutes until
 * it is known), never on a holiday. Within today's spans only (yesterday's
 * late-night span included), as the ShopBite plugin accepts an order;
 * times are `HH:MM` on the 5-minute grid, and a window running past
 * midnight ends at e.g. 01:30 (the time input's min > max).
 */
export function useDeliveryTime(now: Ref<Date>) {
  const { leadTime, fulfillment } = useShippingLeadTime();
  const { schedule } = useServiceSchedule();

  const wording = computed(() => FULFILLMENT_WORDING[fulfillment.value]);

  const choice = computed<WishedTimeWindow | null>(() =>
    schedule.value
      ? wishedTimeWindow(now.value, schedule.value, leadTime.value)
      : null,
  );

  /** The open window with at least one slot on the grid. */
  const open = computed(() => {
    const current = choice.value;
    if (current?.kind !== "open") return null;
    return firstSlot(current.earliest, current.latest) === null
      ? null
      : current;
  });

  /** `undefined` until opening hours and holidays are loaded. */
  const isHoliday = computed<boolean | undefined>(() =>
    choice.value ? choice.value.kind === "holiday" : undefined,
  );

  const minTime = computed<string | null>(() =>
    open.value ? formatClock(open.value.earliest) : null,
  );
  const maxTime = computed<string | null>(() =>
    open.value ? formatClock(open.value.latest) : null,
  );

  const isClosedToday = computed<boolean>(() => open.value === null);

  const helperText = computed<string>(() => {
    const current = choice.value;
    if (!current) return "Lade Informationen...";
    switch (current.kind) {
      case "holiday":
        return "Wegen Betriebsferien geschlossen.";
      case "closing_day":
        return `Heute (${weekdayName(current.weekday)}) ist Ruhetag. Bitte an einem anderen Tag bestellen.`;
      case "none_left":
        return `Heute sind keine ${wording.value.times} mehr verfügbar.`;
    }
    if (!open.value) {
      return `Aktuell keine ${wording.value.time} verfügbar. Bitte später erneut versuchen.`;
    }
    const { ready, span } = current;
    // today's part: a span carried over from last night starts at 00:00
    const range = `${formatClock(Math.max(span.opens, 0))} – ${formatClosing(span.closes)}`;
    if (ready <= span.opens) return `Nächster möglicher Zeitraum: ${range}`;
    const today = ready < MINUTES_PER_DAY ? " (heute)" : "";
    return `Frühestmöglich ab ${formatClock(ready)}${today}, erlaubt: ${range}`;
  });

  /** The chosen time as minutes of the window, `null` outside `HH:MM`. */
  function minutesOf(time: string): number | null {
    return open.value
      ? minutesInWindow(time, open.value.earliest, open.value.latest)
      : null;
  }

  /** The first slot of the window, to prefill the choice. */
  const firstSlotTime = computed<string | null>(() => {
    if (!open.value) return null;
    const slot = firstSlot(open.value.earliest, open.value.latest);
    return slot === null ? null : formatClock(slot);
  });

  /** Whether a chosen time lies in the window. */
  function isWithinWindow(time: string): boolean {
    const minutes = minutesOf(time);
    return (
      minutes !== null &&
      open.value !== null &&
      minutes >= open.value.earliest &&
      minutes <= open.value.latest
    );
  }

  /** A chosen time moved into the window, on the grid. */
  function slotFor(time: string): string | null {
    if (!open.value) return null;
    const { earliest, latest } = open.value;
    const minutes = minutesOf(time) ?? earliest;
    const clamped = Math.min(Math.max(minutes, earliest), latest);
    const slot = firstSlot(clamped, latest) ?? firstSlot(earliest, latest);
    return slot === null ? null : formatClock(slot);
  }

  /**
   * A human-readable error for a chosen time, or null if it is valid (or
   * empty).
   */
  function validate(selectedTime: string | null | undefined): string | null {
    if (!selectedTime) return null;
    if (!/^\d{2}:\d{2}$/.test(selectedTime)) {
      return "Bitte eine gültige Uhrzeit im Format HH:MM eingeben.";
    }
    if (!open.value) return helperText.value;
    const minutes = minutesOf(selectedTime);
    if (minutes === null) return "Bitte eine gültige Uhrzeit auswählen.";
    if (minutes < open.value.earliest) {
      return `Die Zeit liegt vor dem frühestmöglichen Zeitpunkt. Frühestens ab ${minTime.value}.`;
    }
    if (minutes > open.value.latest) {
      return `Die Zeit liegt nach dem spätestmöglichen Zeitpunkt. Spätestens bis ${formatClosing(open.value.latest)}.`;
    }
    if (minutes % WISHED_TIME_STEP !== 0) {
      return "Bitte eine Zeit in 5-Minuten-Schritten auswählen.";
    }
    return null;
  }

  /**
   * A chosen time as the order's wished time: its service date (tomorrow
   * for a time past midnight in a window running into the night) and
   * `HH:MM`; `null` outside `HH:MM` or without an open window.
   */
  function wishedTimeFor(time: string): { date: string; time: string } | null {
    const minutes = minutesOf(time);
    if (minutes === null || !schedule.value) return null;
    const today = restaurantNow(now.value, schedule.value.timeZone).date;
    return {
      date: minutes >= MINUTES_PER_DAY ? shiftDate(today, 1) : today,
      time: formatClock(minutes % MINUTES_PER_DAY),
    };
  }

  return {
    minTime,
    maxTime,
    isClosedToday,
    isHoliday,
    helperText,
    firstSlotTime,
    isWithinWindow,
    slotFor,
    validate,
    wishedTimeFor,
  };
}
