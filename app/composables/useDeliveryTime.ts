import { computed, type Ref } from "vue";

function isTimeWithinBounds(
  time: string,
  min: string | null,
  max: string | null,
): boolean {
  if (!min || !max) return false;
  return time >= min && time <= max;
}

export function useDeliveryTime(now: Ref<Date>) {
  const { deliveryTime } = useShopBiteConfig();
  const {
    getServiceIntervals,
    getEarliestSelectableTime,
    findActiveInterval,
    businessHours,
  } = useBusinessHours();
  const { isClosedHoliday } = useHolidays();

  const earliest = computed<Date>(() =>
    getEarliestSelectableTime(now.value, deliveryTime.value),
  );

  const activeInterval = computed<ServiceInterval | null>(() =>
    findActiveInterval(now.value, deliveryTime.value),
  );

  const minTime = computed<string | null>(() => {
    if (isClosedHoliday(now.value) !== false) return null;
    const interval = activeInterval.value;
    if (!interval) return null;
    const minDate = new Date(
      Math.max(earliest.value.getTime(), interval.start.getTime()),
    );
    return toTimeString(minDate);
  });

  const maxTime = computed<string | null>(() => {
    if (isClosedHoliday(now.value) !== false) return null;
    const interval = activeInterval.value;
    return interval ? toTimeString(interval.end) : null;
  });

  const isClosedToday = computed<boolean>(() => activeInterval.value === null);

  const helperText = computed<string>(() => {
    const isHoliday = isClosedHoliday(now.value);
    if (isHoliday === undefined) {
      return "Lade Informationen...";
    }
    if (isHoliday) {
      return "Wegen Betriebsferien geschlossen.";
    }

    const interval = activeInterval.value;
    if (!interval) {
      const dayOfWeek = now.value.getDay();
      const hasOpeningsToday =
        businessHours.value?.some((bh) => bh.dayOfWeek === dayOfWeek) ?? false;

      if (!hasOpeningsToday) {
        const dayName = [
          "Sonntag",
          "Montag",
          "Dienstag",
          "Mittwoch",
          "Donnerstag",
          "Freitag",
          "Samstag",
        ][dayOfWeek];
        return `Heute (${dayName}) ist Ruhetag. Bitte an einem anderen Tag bestellen.`;
      }

      const intervals = getServiceIntervals(now.value);
      const lastInterval = intervals.at(-1);
      if (lastInterval && earliest.value > lastInterval.end) {
        return "Heute sind keine Lieferzeiten mehr verfügbar.";
      }
      return "Aktuell keine Lieferzeit verfügbar. Bitte später erneut versuchen.";
    }

    const startStr = toTimeString(interval.start);
    const endStr = toTimeString(interval.end);
    const earliestStr = toTimeString(earliest.value);

    return earliest.value <= interval.start
      ? `Nächster möglicher Zeitraum: ${startStr} – ${endStr}`
      : `Frühestmöglich ab ${earliestStr} (heute), erlaubt: ${startStr} – ${endStr}`;
  });

  function clampTimeToInterval(
    selectedTime: string,
    min: string,
    max: string,
    baseDate: Date,
  ): string {
    const selected = parseTimeString(selectedTime, baseDate);
    const minDate = parseTimeString(min, baseDate);
    const maxDate = parseTimeString(max, baseDate);

    let clamped = selected;
    if (selected < minDate) clamped = minDate;
    if (selected > maxDate) clamped = maxDate;

    return toTimeString(clamped);
  }

  /**
   * Validate a selected time and return a human-readable error message,
   * or null if the time is valid (or empty).
   */
  function validate(selectedTime: string | null | undefined): string | null {
    // No value -> no error (let required-validation happen elsewhere if needed)
    if (!selectedTime) return null;

    // Simple HH:MM check – prevents parse errors and immediate feedback
    const isHHMM = /^\d{2}:\d{2}$/.test(selectedTime);
    if (!isHHMM) {
      return "Bitte eine gültige Uhrzeit im Format HH:MM eingeben.";
    }

    // Closed or no selectable window
    if (isClosedToday.value || !minTime.value || !maxTime.value) {
      return helperText.value;
    }

    // Bound checks (string compare works for HH:MM)
    if (selectedTime < minTime.value) {
      return `Die Zeit liegt vor dem frühestmöglichen Zeitpunkt. Frühestens ab ${minTime.value}.`;
    }
    if (selectedTime > maxTime.value) {
      return `Die Zeit liegt nach dem spätestmöglichen Zeitpunkt. Spätestens bis ${maxTime.value}.`;
    }

    // Optional: enforce 5-minute steps (step="300" in input)
    try {
      const parsed = parseTimeString(selectedTime, now.value);
      const minutes = parsed.getHours() * 60 + parsed.getMinutes();
      if (minutes % 5 !== 0) {
        return "Bitte eine Zeit in 5-Minuten-Schritten auswählen.";
      }
    } catch {
      // If parsing fails for some reason, show a generic message
      return "Bitte eine gültige Uhrzeit auswählen.";
    }

    return null;
  }

  return {
    earliest,
    activeInterval,
    minTime,
    maxTime,
    isClosedToday,
    helperText,
    clampTimeToInterval,
    isTimeWithinBounds,
    validate,
  };
}
