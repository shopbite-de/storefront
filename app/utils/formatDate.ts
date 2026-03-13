export function formatDate(date: string | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
