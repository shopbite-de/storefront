/** Removes the discount of a voucher. */
export default defineEventHandler((event) =>
  answerCart(event, "write", (cart, session) =>
    cart.removeVoucher(
      session,
      voucherCode(decodeURIComponent(getRouterParam(event, "code") ?? "")),
    ),
  ),
);
