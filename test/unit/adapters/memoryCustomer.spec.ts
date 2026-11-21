import { describe, expect, it } from "vitest";
import { createMemoryBackend } from "../../../server/adapters/memory";
import { dishConfiguration } from "../../../shared/domain";
import { COLA, MARGHERITA, testSession } from "../../contract/cart.contract";
import { REGISTRATION } from "../../contract/customer.contract";
import { RESTAURANT, STOREFRONT_URL } from "../../contract/ordering.contract";
import { memoryOrderingSeed } from "../../contract/orderingFixtures";

/**
 * The memory account's carts: the customer's saved cart is never lost by a
 * logout, and a login never takes another customer's cart along.
 */
const lines = async (
  backend: ReturnType<typeof createMemoryBackend>,
  session: ReturnType<typeof testSession>,
) =>
  (await backend.cart.getCart(session)).lines
    .map((line) => `${line.dishNumber}x${line.quantity}`)
    .sort();

describe("memory customer carts", () => {
  it("keeps the saved cart when a second session of the customer logs out", async () => {
    const backend = createMemoryBackend(memoryOrderingSeed(RESTAURANT));
    const first = testSession();
    await backend.customer.register(first, REGISTRATION, STOREFRONT_URL);
    const second = testSession();
    await backend.customer.login(
      second,
      REGISTRATION.email,
      REGISTRATION.password,
    );
    await backend.cart.addLine(first, dishConfiguration({ dishId: COLA }), 1);
    await backend.cart.addLine(
      second,
      dishConfiguration({ dishId: MARGHERITA }),
      1,
    );
    await backend.customer.logout(first);
    await backend.customer.logout(second);
    const again = testSession();
    await backend.customer.login(
      again,
      REGISTRATION.email,
      REGISTRATION.password,
    );
    expect(await lines(backend, again)).toEqual(["21x1", "80x1"]);
  });

  it("does not take another customer's cart into an account", async () => {
    const backend = createMemoryBackend(memoryOrderingSeed(RESTAURANT));
    const session = testSession();
    await backend.customer.register(session, REGISTRATION, STOREFRONT_URL);
    await backend.cart.addLine(session, dishConfiguration({ dishId: COLA }), 2);
    const other = { ...REGISTRATION, email: "otto@example.com" };
    await backend.customer.register(testSession(), other, STOREFRONT_URL);
    // the same session logs in as Otto while logged in as Erika
    await backend.customer.login(session, other.email, other.password);
    expect(await lines(backend, session)).toEqual([]);
    const erika = testSession();
    await backend.customer.login(
      erika,
      REGISTRATION.email,
      REGISTRATION.password,
    );
    expect(await lines(backend, erika)).toEqual(["80x2"]);
  });
});
