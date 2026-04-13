import type { CustomerAddress } from "~/types/commerce/user";

/**
 * Platform-agnostic address management backed by /api/addresses/*.
 * Replaces useAddress() from @shopware/composables.
 */
export function useCommerceAddress() {
  const customerAddresses = ref<CustomerAddress[]>([]);

  async function loadCustomerAddresses(): Promise<void> {
    customerAddresses.value = await $fetch<CustomerAddress[]>("/api/addresses");
  }

  async function createCustomerAddress(
    data: Omit<CustomerAddress, "id">,
  ): Promise<CustomerAddress> {
    const created = await $fetch<CustomerAddress>("/api/addresses", {
      method: "POST",
      body: data as unknown as Record<string, unknown>,
    });
    return created;
  }

  async function updateCustomerAddress(
    data: CustomerAddress,
  ): Promise<CustomerAddress> {
    const updated = await $fetch<CustomerAddress>(`/api/addresses/${data.id}`, {
      method: "PATCH",
      body: data as unknown as Record<string, unknown>,
    });
    return updated;
  }

  async function setDefaultCustomerShippingAddress(id: string): Promise<void> {
    await $fetch(`/api/addresses/default/shipping/${id}`, { method: "PUT" });
  }

  async function setDefaultCustomerBillingAddress(id: string): Promise<void> {
    await $fetch(`/api/addresses/default/billing/${id}`, { method: "PUT" });
  }

  return {
    customerAddresses,
    loadCustomerAddresses,
    createCustomerAddress,
    updateCustomerAddress,
    setDefaultCustomerShippingAddress,
    setDefaultCustomerBillingAddress,
  };
}
