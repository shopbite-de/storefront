/**
 * Freezes a plain value and everything in it, for answers of adapters.
 * Descends into parts that are frozen already (a frozen list of unfrozen
 * entries).
 */
export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value && typeof value === "object" && !seen.has(value)) {
    seen.add(value);
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
  }
  return value;
}
