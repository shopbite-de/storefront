import type { Cart, Id } from "../../shared/domain";

/** The body of `POST /api/cart/lines`: a dish configuration and its quantity. */
export type CartLineRequest = {
  dishId: Id;
  variantId: Id | null;
  extraIds: Id[];
  removedIngredientIds: Id[];
  quantity: number;
};

/** The BFF's 409 for a request with an outdated session cookie. */
function isStaleSession(error: unknown): boolean {
  return (
    (error as { data?: { data?: { code?: string } } } | null)?.data?.data
      ?.code === "stale_session"
  );
}

// Module-level so every component instance in the browser shares one
// queue. On the server this state would be shared across requests, so
// server-side calls bypass it (see `enqueue`/`setQuantity`).
let queue: Promise<unknown> = Promise.resolve();
const pendingQuantities = new Map<string, number>();
const queuedQuantityTasks = new Map<string, Promise<void>>();

/**
 * Cart writes through the BFF (`/api/cart/lines`, ADR 0001 step 4),
 * serialised and coalesced in the browser.
 *
 * One queue for all writes, a quantity change made while another is in
 * flight only sends the latest value, and a final failure leaves the cart
 * as it was: it is re-synced (#241). The server runs a visitor's writes one
 * after the other and retries Shopware's cart lock.
 */
export function useCartMutations() {
  const { cart, setCart, refresh } = useCartData();

  const pendingCount = useState("cart-mutations-pending", () => 0);
  const isMutating = computed(() => pendingCount.value > 0);

  /**
   * Sends a write; once more when the server says it carried an outdated
   * session (a parallel request replaced it, e.g. a login): the browser has
   * the new cookie by then.
   */
  async function write(request: () => Promise<Cart>): Promise<Cart> {
    let next: Cart;
    try {
      next = await request();
    } catch (error) {
      if (!isStaleSession(error)) throw error;
      next = await request();
    }
    setCart(next);
    return next;
  }

  /**
   * Runs `task` after every previously queued cart write. Resolves with
   * `undefined` when the write failed.
   */
  function enqueue<T>(task: () => Promise<T>): Promise<T | undefined> {
    pendingCount.value++;
    const run = async (): Promise<T | undefined> => {
      try {
        return await task();
      } catch (error) {
        console.error("[cart][mutation]", error);
        await refresh().catch(() => {});
        return undefined;
      } finally {
        pendingCount.value--;
      }
    };
    // No shared queue on the server: it would span unrelated requests.
    if (import.meta.server) return run();

    const result = queue.then(run, run);
    queue = result;
    return result;
  }

  const changeQuantity = (lineId: Id, quantity: number) =>
    write(() =>
      $fetch<Cart>(`/api/cart/lines/${encodeURIComponent(lineId)}`, {
        method: "PATCH",
        body: { quantity },
      }),
    );

  /**
   * Changes a line's quantity. Calls made while a change for the same line
   * is still waiting are merged into one request carrying the latest value.
   */
  function setQuantity(lineId: Id, quantity: number): Promise<void> {
    if (import.meta.server) {
      return enqueue(() => changeQuantity(lineId, quantity)).then(
        () => undefined,
      );
    }

    pendingQuantities.set(lineId, quantity);
    const queued = queuedQuantityTasks.get(lineId);
    if (queued) return queued;

    const task = enqueue(async () => {
      queuedQuantityTasks.delete(lineId);
      const target = pendingQuantities.get(lineId);
      pendingQuantities.delete(lineId);
      if (target === undefined) return;

      const current = cart.value?.lines.find(
        (line) => line.id === lineId,
      )?.quantity;
      if (target === current) return;

      await changeQuantity(lineId, target);
    }).then(() => undefined);

    queuedQuantityTasks.set(lineId, task);
    return task;
  }

  function removeLine(lineId: Id) {
    return enqueue(() =>
      write(() =>
        $fetch<Cart>(`/api/cart/lines/${encodeURIComponent(lineId)}`, {
          method: "DELETE",
        }),
      ),
    );
  }

  function addLine(line: CartLineRequest) {
    return enqueue(() =>
      write(() =>
        $fetch<Cart>("/api/cart/lines", { method: "POST", body: line }),
      ),
    );
  }

  return {
    isMutating,
    setQuantity,
    removeLine,
    addLine,
  };
}
