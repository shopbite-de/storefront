import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import type {
  Customer,
  CustomerAddress,
  SessionContext,
} from "~~/app/types/commerce/user";

type SwCustomer = components["schemas"]["Customer"];
type SwCustomerAddress = components["schemas"]["CustomerAddress"];
type SwContext = components["schemas"]["SalesChannelContext"];

function toCustomerAddress(sw: SwCustomerAddress): CustomerAddress {
  return {
    id: sw.id ?? "",
    firstName: sw.firstName ?? undefined,
    lastName: sw.lastName ?? undefined,
    company: sw.company ?? undefined,
    department: sw.department ?? undefined,
    street: sw.street ?? "",
    additionalAddressLine1: sw.additionalAddressLine1 ?? undefined,
    zipcode: sw.zipcode ?? undefined,
    city: sw.city ?? "",
    phoneNumber: sw.phoneNumber ?? undefined,
    countryId: sw.countryId ?? "",
  };
}

export function toCustomer(sw: SwCustomer): Customer {
  return {
    id: sw.id ?? "",
    email: sw.email ?? "",
    firstName: sw.firstName ?? "",
    lastName: sw.lastName ?? "",
    guest: sw.guest ?? false,
    defaultShippingAddress: sw.defaultShippingAddress
      ? toCustomerAddress(sw.defaultShippingAddress as SwCustomerAddress)
      : undefined,
    defaultBillingAddress: sw.defaultBillingAddress
      ? toCustomerAddress(sw.defaultBillingAddress as SwCustomerAddress)
      : undefined,
  };
}

export function toSessionContext(sw: SwContext): SessionContext {
  const customer = sw.customer ? toCustomer(sw.customer as SwCustomer) : null;

  const isGuest = customer?.guest ?? false;
  const isLoggedIn = customer !== null && !isGuest;

  const paymentMethod = sw.paymentMethod as { id?: string } | null | undefined;
  const shippingMethod = sw.shippingMethod as
    | { id?: string }
    | null
    | undefined;

  const salesChannel = sw.salesChannel as
    | { navigationCategoryId?: string }
    | null
    | undefined;
  const currency = sw.currency as { isoCode?: string } | null | undefined;

  return {
    isLoggedIn,
    isGuestSession: customer !== null && isGuest,
    user: customer,
    selectedPaymentMethodId: paymentMethod?.id ?? null,
    selectedShippingMethodId: shippingMethod?.id ?? null,
    navigationCategoryId: salesChannel?.navigationCategoryId ?? null,
    currencyIsoCode: currency?.isoCode ?? "EUR",
  };
}

export function toCustomerAddressList(raw: unknown[]): CustomerAddress[] {
  return (raw as SwCustomerAddress[]).map(toCustomerAddress);
}
