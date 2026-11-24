/**
 * GET /api/_test/mails: what the memory backend would have e-mailed in the
 * current scenario; GET /api/_test/orders: the orders it took (number and
 * e-mail). Test seam only (`modules/test-seams.ts`).
 */
import { createError, defineEventHandler, getRequestURL } from "h3";
import { useRuntimeConfig } from "nitropack/runtime";
import { outbox, placedOrders } from "./state";

export default defineEventHandler((event) => {
  if (useRuntimeConfig(event).shopBite.backend !== "memory") {
    throw createError({ statusCode: 404 });
  }
  return getRequestURL(event).pathname.endsWith("/orders")
    ? { orders: placedOrders }
    : { mails: outbox };
});
