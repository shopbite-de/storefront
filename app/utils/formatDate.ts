/**
 * Date and time of an instant in the shop's language (`de-DE`, `en-GB`)
 * and the restaurant's time zone (`ShopConfig.timeZone`), never the
 * visitor's or the server's clock: the server's HTML and the browser's
 * render show the same time, the one the restaurant reads.
 */
export function formatDate(
  date: string | undefined,
  language: string,
  timeZone: string,
) {
  if (!date) return "";
  return new Date(date).toLocaleString(language, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}
