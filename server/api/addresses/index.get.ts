import { toCustomerAddressList } from "~~/server/adapters/shopware/user";

const criteria = {
  includes: {
    customer_address: [
      "id",
      "firstName",
      "lastName",
      "company",
      "department",
      "street",
      "additionalAddressLine1",
      "zipcode",
      "city",
      "phoneNumber",
      "countryId",
    ],
  },
};

export default defineEventHandler(async (event) => {
  const sw = await shopwareFetch<{ elements: unknown[] }>(
    event,
    "/account/list-address",
    {
      method: "POST",
      body: criteria,
    },
  );

  return toCustomerAddressList(sw.elements ?? []);
});
