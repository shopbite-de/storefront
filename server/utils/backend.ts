import type { H3Event } from "h3";
import type { Backend } from "../ports";
import { createBackend } from "../adapters/registry";

let current: { name: string; backend: Backend } | undefined;

/**
 * The adapter set selected by `shopBite.backend` (ADR 0001): `shopware`
 * (default) or `memory`. Server routes reach the shop backend only through
 * it. One instance per process, so the memory adapter keeps its state.
 */
export function useBackend(event?: H3Event): Backend {
  const config = useRuntimeConfig(event);
  const name = config.shopBite.backend;
  if (current?.name !== name) {
    current = {
      name,
      backend: createBackend(name, {
        storeApi: { get: storeApiGet, post: storeApiPost },
        storeUrl: config.public.storeUrl,
      }),
    };
  }
  return current.backend;
}
