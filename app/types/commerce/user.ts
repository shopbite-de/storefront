export interface CustomerAddress {
  id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  department?: string;
  street: string;
  additionalAddressLine1?: string;
  additionalAddressLine2?: string;
  zipcode?: string;
  city: string;
  phoneNumber?: string;
  countryId: string;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  guest: boolean;
  defaultShippingAddress?: CustomerAddress;
  defaultBillingAddress?: CustomerAddress;
}

export interface SessionContext {
  isLoggedIn: boolean;
  isGuestSession: boolean;
  user: Customer | null;
  selectedPaymentMethodId: string | null;
  selectedShippingMethodId: string | null;
  navigationCategoryId: string | null;
  currencyIsoCode: string;
}
