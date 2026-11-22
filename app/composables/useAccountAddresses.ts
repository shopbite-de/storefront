import type { Address, AddressInput, Customer } from "../../shared/domain";

/** An address of the account to save: a new one without id. */
export type AccountAddressInput = AddressInput & { id: string | null };

/**
 * The account's address book (ADR 0001, step 6): `GET
 * /api/account/addresses`, saving (new or changed), deleting and the
 * default billing and delivery address, all through the BFF. The defaults
 * are the customer's (`useCustomer`), which a change of them updates.
 */
export function useAccountAddresses() {
  const addresses = useState<readonly Address[] | null>(
    "account-addresses",
    () => null,
  );
  const { customer, refresh: refreshCustomer } = useCustomer();
  const customerState = useState<Customer | null | undefined>("customer");

  /** The account's addresses; null when the customer switched meanwhile. */
  async function refresh(): Promise<readonly Address[] | null> {
    const answer = await guardedAccountRead((signal) =>
      $fetch<readonly Address[]>("/api/account/addresses", { signal }),
    );
    if (answer) addresses.value = answer;
    return answer;
  }

  const write = <T>(task: () => Promise<T>) =>
    queuedWrite(() => withStaleRetry(task));

  async function save(address: AccountAddressInput): Promise<Address> {
    const { id, ...fields } = address;
    const saved = await write(() =>
      id
        ? $fetch<Address>(`/api/account/addresses/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: fields,
          })
        : $fetch<Address>("/api/account/addresses", {
            method: "POST",
            body: fields,
          }),
    );
    await refresh();
    return saved;
  }

  async function remove(addressId: string): Promise<void> {
    await write(() =>
      $fetch(`/api/account/addresses/${encodeURIComponent(addressId)}`, {
        method: "DELETE",
      }),
    );
    await refresh();
  }

  async function setDefault(
    addressId: string,
    use: "billing" | "delivery",
  ): Promise<void> {
    const next = await write(() =>
      $fetch<Customer>(
        `/api/account/addresses/${encodeURIComponent(addressId)}/default`,
        { method: "POST", body: { use } },
      ),
    );
    customerState.value = next;
    await refresh();
  }

  const byId = (id: string | null | undefined) =>
    addresses.value?.find((address) => address.id === id) ?? null;

  return {
    addresses: computed(() => addresses.value),
    defaultBillingAddress: computed(() =>
      byId(customer.value?.defaultBillingAddressId),
    ),
    defaultDeliveryAddress: computed(() =>
      byId(customer.value?.defaultDeliveryAddressId),
    ),
    refresh,
    refreshCustomer,
    save,
    remove,
    setDefault,
  };
}
