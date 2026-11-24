/** Date and time of an instant in the shop's language (`de-DE`, `en-GB`). */
export function formatDate(date: string | undefined, language: string) {
  if (!date) return "";
  return new Date(date).toLocaleString(language, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
