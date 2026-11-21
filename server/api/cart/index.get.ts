/** The visitor's cart (`Cart`); empty for a visitor without a session. */
export default defineEventHandler((event) =>
  answerCart(event, "read", (cart, session) => cart.getCart(session)),
);
