import type { Address, GuestDetails, Orderer } from "../../shared/domain";

/**
 * Who orders in this session (ADR 0001, step 5): the guest after "Angaben
 * speichern", or the logged-in customer, with the billing and delivery
 * address the order uses (`/api/checkout/orderer`). `undefined` until it
 * is loaded, `null` for a visitor without details. A guest registers and
 * edits an address through the BFF; login and account registration are
 * still the Shopware layer's (step 6), after which the checkout loads the
 * orderer again.
 */
export function useCheckoutOrderer() {
  const orderer = useState<Orderer | null | undefined>(
    "checkout-orderer",
    () => undefined,
  );

  // the Shopware layer's account state (header "Mein Konto") knows the
  // guest from its context until accounts move behind the BFF (step 6);
  // taken here: after an await there is no app context to inject it from
  const { refreshSessionContext } = useSessionContext();

  async function refresh(): Promise<Orderer | null> {
    const answer = await $fetch<{ orderer: Orderer | null }>(
      "/api/checkout/orderer",
    );
    orderer.value = answer.orderer;
    return answer.orderer;
  }

  async function registerGuest(details: GuestDetails): Promise<Orderer> {
    const next = await queuedWrite(() =>
      withStaleRetry(() =>
        $fetch<Orderer>("/api/checkout/guest", {
          method: "POST",
          body: details,
        }),
      ),
    );
    orderer.value = next;
    refreshSessionContext().catch((error) => {
      console.error("[checkout][session context]", error);
    });
    return next;
  }

  async function updateAddress(address: Address): Promise<Orderer> {
    const { id, ...fields } = address;
    const next = await queuedWrite(() =>
      withStaleRetry(() =>
        $fetch<Orderer>(
          `/api/checkout/orderer/addresses/${encodeURIComponent(id ?? "")}`,
          { method: "PATCH", body: fields },
        ),
      ),
    );
    orderer.value = next;
    return next;
  }

  return {
    orderer: computed(() => orderer.value),
    refresh,
    registerGuest,
    updateAddress,
  };
}
