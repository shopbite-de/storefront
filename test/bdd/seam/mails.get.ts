/**
 * GET /api/_test/mails: what the memory backend would have e-mailed in the
 * current scenario. Test seam only (`modules/test-seams.ts`).
 */
import { createError, defineEventHandler } from "h3";
import { useRuntimeConfig } from "nitropack/runtime";
import { outbox } from "./state";

export default defineEventHandler((event) => {
  if (useRuntimeConfig(event).shopBite.backend !== "memory") {
    throw createError({ statusCode: 404 });
  }
  return { mails: outbox };
});
