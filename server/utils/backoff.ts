/** Remembers a failure for `ms`, so an outage is not asked on every request. */
export function createBackoff(
  ms: number,
  now: () => number = () => Date.now(),
) {
  let until = 0;
  return {
    active: () => now() < until,
    trip: () => {
      until = now() + ms;
    },
  };
}
