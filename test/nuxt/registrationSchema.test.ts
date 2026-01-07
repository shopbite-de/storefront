import { describe, it, expect } from "vitest";
import { createRegistrationSchema } from "~/validation/registrationSchema";

describe("registrationSchema", () => {
  const baseState = {
    accountType: "private",
    guest: false,
    isShippingAddressDifferent: false,
    password: "password123",
  };

  const validAddress = {
    street: "Musterstraße 1",
    city: "Musterstadt",
    countryId: "country-id",
    phoneNumber: "123456789",
    zipcode: "12345",
  };

  const validData = {
    accountType: "private",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    guest: false,
    acceptedDataProtection: true,
    password: "password123",
    passwordConfirm: "password123",
    billingAddress: validAddress,
  };

  it("should validate a valid private account", () => {
    const schema = createRegistrationSchema(baseState);
    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should fail if company is missing for business account", () => {
    const businessState = { ...baseState, accountType: "business" };
    const businessData = {
      ...validData,
      accountType: "business",
      billingAddress: { ...validAddress },
    };
    const schema = createRegistrationSchema(businessState);
    const result = schema.safeParse(businessData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Als Geschäftskunde ist der Firmenname ein Pflichtfeld.",
      );
      expect(result.error.issues[0].path).toContain("billingAddress");
      expect(result.error.issues[0].path).toContain("company");
    }
  });

  it("should validate a valid business account", () => {
    const businessState = { ...baseState, accountType: "business" };
    const businessData = {
      ...validData,
      accountType: "business",
      billingAddress: { ...validAddress, company: "Test Corp" },
    };
    const schema = createRegistrationSchema(businessState);
    const result = schema.safeParse(businessData);
    expect(result.success).toBe(true);
  });

  it("should require shipping address fields if different from billing address", () => {
    const shippingState = { ...baseState, isShippingAddressDifferent: true };
    const shippingData = {
      ...validData,
      isShippingAddressDifferent: true,
      shippingAddress: {
        firstName: "",
        lastName: "",
        street: "",
        city: "",
        phoneNumber: "",
        company: "",
      },
    };
    const schema = createRegistrationSchema(shippingState);
    const result = schema.safeParse(shippingData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "Bitte geben Sie den Vornamen für die Lieferadresse an.",
      );
      expect(messages).toContain(
        "Bitte geben Sie den Nachnamen für die Lieferadresse an.",
      );
      expect(messages).toContain(
        "Bitte geben Sie die Straße für die Lieferadresse an.",
      );
      expect(messages).toContain(
        "Bitte geben Sie den Ort für die Lieferadresse an.",
      );
    }
  });

  it("should require company in shipping address for business account if different", () => {
    const shippingState = {
      ...baseState,
      accountType: "business",
      isShippingAddressDifferent: true,
    };
    const shippingData = {
      ...validData,
      accountType: "business",
      isShippingAddressDifferent: true,
      billingAddress: { ...validAddress, company: "Billing Corp" },
      shippingAddress: {
        firstName: "Jane",
        lastName: "Doe",
        street: "Shipping St 1",
        city: "ShipCity",
        phoneNumber: "987654321",
        company: "",
      },
    };
    const schema = createRegistrationSchema(shippingState);
    const result = schema.safeParse(shippingData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "Bitte geben Sie den Firmennamen für die Lieferadresse an.",
      );
    }
  });

  it("should validate different shipping address for business", () => {
    const shippingState = {
      ...baseState,
      accountType: "business",
      isShippingAddressDifferent: true,
    };
    const shippingData = {
      ...validData,
      accountType: "business",
      isShippingAddressDifferent: true,
      billingAddress: { ...validAddress, company: "Billing Corp" },
      shippingAddress: {
        firstName: "Jane",
        lastName: "Doe",
        street: "Shipping St 1",
        city: "ShipCity",
        phoneNumber: "987654321",
        company: "Shipping Corp",
        zipcode: "54321",
        countryId: "country-id",
      },
    };
    const schema = createRegistrationSchema(shippingState);
    const result = schema.safeParse(shippingData);
    expect(result.success).toBe(true);
  });

  it("should not require password for guest", () => {
    const guestState = { ...baseState, guest: true };
    const guestData = {
      ...validData,
      guest: true,
      password: "",
      passwordConfirm: "",
    };
    const schema = createRegistrationSchema(guestState);
    const result = schema.safeParse(guestData);
    expect(result.success).toBe(true);
  });

  it("should require password for non-guest", () => {
    const schema = createRegistrationSchema(baseState);
    const result = schema.safeParse({
      ...validData,
      password: "",
      passwordConfirm: "",
    });
    expect(result.success).toBe(false);
  });

  it("should fail if data protection is not accepted", () => {
    const schema = createRegistrationSchema(baseState);
    const result = schema.safeParse({
      ...validData,
      acceptedDataProtection: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Bitte akzeptieren Sie die Datenschutzbestimmungen.",
      );
      expect(result.error.issues[0].path).toContain("acceptedDataProtection");
    }
  });

  it("should fail if street does not contain a house number", () => {
    const schema = createRegistrationSchema(baseState);
    const result = schema.safeParse({
      ...validData,
      billingAddress: {
        ...validAddress,
        street: "Musterstraße",
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Bitte geben Sie Ihre Straße und Hausnummer an.",
      );
      expect(result.error.issues[0].path).toContain("billingAddress");
      expect(result.error.issues[0].path).toContain("street");
    }
  });

  it("should fail if shipping street does not contain a house number when different", () => {
    const shippingState = { ...baseState, isShippingAddressDifferent: true };
    const shippingData = {
      ...validData,
      isShippingAddressDifferent: true,
      shippingAddress: {
        ...validAddress,
        street: "Shipping Street",
      },
    };
    const schema = createRegistrationSchema(shippingState);
    const result = schema.safeParse(shippingData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "Bitte geben Sie Ihre Straße und Hausnummer an.",
      );
      const streetIssue = result.error.issues.find((i) =>
        i.path.includes("street"),
      );
      expect(streetIssue?.path).toContain("shippingAddress");
    }
  });
});
