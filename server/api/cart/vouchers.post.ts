/**
 * Applies a voucher: `{ code }`. A code that does not apply answers the
 * cart with a `voucher_invalid` message about it.
 */
export default defineEventHandler(async (event) =>
  answerCart(event, "write", async (cart, session) =>
    cart.applyVoucher(
      session,
      voucherCode((await readBody<{ code?: unknown }>(event))?.code),
    ),
  ),
);
