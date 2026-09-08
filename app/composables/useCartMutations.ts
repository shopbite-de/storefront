import type { Schemas, operations } from "#shopware";

type LineItems =
  operations["addLineItem post /checkout/cart/line-item"]["body"]["items"];

const CART_LOCKED_STATUS = 409;
const CART_LOCKED_CODE = "CHECKOUT__CART_LOCKED";
const LOCK_RETRY_DELAY_MS = 400;

/**
 * Shopware rejects a cart write while another write for the same cart
 * token is still running ("locked due to concurrent write operation").
 */
export function isCartLockedError(error: unknown): boolean {
  const candidate = error as {
    status?: number;
    details?: { errors?: { code?: string }[] };
  };
  return (
    candidate?.status === CART_LOCKED_STATUS ||
    (candidate?.details?.errors ?? []).some(
      (detail) => detail.code === CART_LOCKED_CODE,
    )
  );
}

// Module-level so every component instance in the browser shares one
// queue. On the server this state would be shared across requests, so
// server-side calls bypass it (see `enqueue`/`setQuantity`).
let queue: Promise<unknown> = Promise.resolve();
const pendingQuantities = new Map<string, number>();
const queuedQuantityTasks = new Map<string, Promise<void>>();

/**
 * Serializes all cart writes and coalesces rapid quantity changes.
 *
 * The Store API allows only one write per cart at a time; firing them
 * concurrently (e.g. quick +/- clicks) yields `CHECKOUT__CART_LOCKED`
 * conflicts. Every write goes through one queue, a quantity change made
 * while another is in flight only sends the latest value, a lock conflict
 * is retried once, and a final failure is reported to the customer and
 * the cart re-synced. See issue #241.
 */
export function useCartMutations() {
  const { cart, refreshCart, addProducts, changeProductQuantity, removeItem } =
    useCart();
  const toast = useToast();

  const pendingCount = useState("cart-mutations-pending", () => 0);
  const isMutating = computed(() => pendingCount.value > 0);

  /** Retries the actual API request (not the whole task) once on a lock conflict. */
  async function withLockRetry<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (!isCartLockedError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_DELAY_MS));
      return request();
    }
  }

  /**
   * Sends one cart write and syncs the shared cart state from its
   * response. The layer's write functions already do that internally;
   * doing it here as well keeps the queue's contract explicit.
   */
  async function write(
    request: () => Promise<Schemas["Cart"]>,
  ): Promise<Schemas["Cart"]> {
    const newCart = await withLockRetry(request);
    await refreshCart(newCart);
    return newCart;
  }

  /**
   * Runs `task` after every previously queued cart write. Resolves with
   * `undefined` when the write failed; the failure is already reported.
   */
  function enqueue<T>(
    task: () => Promise<T>,
    failureTitle: string,
  ): Promise<T | undefined> {
    pendingCount.value++;
    const run = async (): Promise<T | undefined> => {
      try {
        return await task();
      } catch (error) {
        console.error("[cart][mutation]", error);
        toast.add({
          title: failureTitle,
          description: "Bitte versuche es erneut.",
          color: "error",
          icon: "i-lucide-x-circle",
          progress: false,
        });
        await refreshCart().catch(() => {});
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

  /**
   * Changes a line item's quantity. Calls made while a change for the
   * same line item is still waiting are merged into one request carrying
   * the latest value.
   */
  function setQuantity(lineItemId: string, quantity: number): Promise<void> {
    if (import.meta.server) {
      return enqueue(
        () => write(() => changeProductQuantity({ id: lineItemId, quantity })),
        "Menge konnte nicht geändert werden",
      ).then(() => undefined);
    }

    pendingQuantities.set(lineItemId, quantity);
    const queued = queuedQuantityTasks.get(lineItemId);
    if (queued) return queued;

    const task = enqueue(async () => {
      queuedQuantityTasks.delete(lineItemId);
      const target = pendingQuantities.get(lineItemId);
      pendingQuantities.delete(lineItemId);
      if (target === undefined) return;

      const current = cart.value?.lineItems?.find(
        (item) => item.id === lineItemId,
      )?.quantity;
      if (target === current) return;

      await write(() =>
        changeProductQuantity({ id: lineItemId, quantity: target }),
      );
    }, "Menge konnte nicht geändert werden").then(() => undefined);

    queuedQuantityTasks.set(lineItemId, task);
    return task;
  }

  function removeLineItem(lineItem: Schemas["LineItem"]) {
    return enqueue(
      () => write(() => removeItem(lineItem)),
      "Artikel konnte nicht entfernt werden",
    );
  }

  function addLineItems(items: LineItems) {
    return enqueue(
      () => write(() => addProducts(items)),
      "Artikel konnte nicht in den Warenkorb gelegt werden",
    );
  }

  return {
    isMutating,
    setQuantity,
    removeLineItem,
    addLineItems,
  };
}
