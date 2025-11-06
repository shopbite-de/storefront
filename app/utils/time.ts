// app/utils/time.ts

export function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function toTimeString(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function setTime(date: Date, h: number, m: number): Date {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

export function parseTimeString(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(":").map((n) => Number.parseInt(n));
  return setTime(baseDate, hours as number, minutes as number);
}
