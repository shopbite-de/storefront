import type {
  Address,
  Customer,
  GuestDetails,
  Orderer,
} from "../../shared/domain";

/**
 * Who orders in this session (ADR 0001, step 5): the guest after "Angaben
 * speichern", or the logged-in customer, with the billing and delivery
 * address the order uses (`/api/checkout/orderer`). `undefined` until it
 * is loaded, `null` for a visitor without details. A guest registers and
 * edits an address through the BFF; after a login or an account
 * registration (`useCustomer`, step 6) the checkout loads the orderer
 * again.
 */
export function useCheckoutOrderer() {
  const orderer = useState<Orderer | null | undefined>(
    "checkout-orderer",
    () => undefined,
  );

  // the session's customer (`useCustomer`, header "Mein Konto"): the
  // guest; taken here, after an await there is no app context
  const customer = useState<Customer | null | undefined>("customer");

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
    customer.value = next.customer;
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
