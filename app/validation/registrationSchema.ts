// schemas/registrationSchema.ts
import * as z from "zod";

/*
 * The messages are message keys (`auth.validation.*`, ADR 0002): the form
 * translates `issue.message` where it shows it.
 */

export const baseAddressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  salutationId: z.string().optional(),
  street: z
    .string()
    .min(1, { message: "auth.validation.streetWithNumber" })
    .refine((val) => /[0-9]/.test(val), {
      message: "auth.validation.streetWithNumber",
    }),
  additionalAddressLine1: z.string().optional(),
  zipcode: z.string().optional(),
  city: z.string().min(1, {
    message: "auth.validation.cityRequired",
  }),
  countryId: z.string().min(1, { message: "auth.validation.countryRequired" }),
  phoneNumber: z.string().min(7, {
    message: "auth.validation.phoneInvalid",
  }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createRegistrationSchema = (state: any) =>
  z.object({
    accountType: z.enum(["private", "business"], {
      errorMap: () => ({ message: "auth.validation.accountTypeRequired" }),
    }),
    email: z.string().email("auth.shared.emailInvalid"),
    firstName: z
      .string()
      .min(1, { message: "auth.validation.firstNameRequired" }),
    lastName: z
      .string()
      .min(1, { message: "auth.validation.lastNameRequired" }),
    guest: z.boolean(),
    acceptedDataProtection: z.boolean().refine((val) => val, {
      message: "auth.validation.privacyRequired",
    }),
    password: z
      .string()
      .optional()
      .refine(
        (val) => {
          return state.guest || (val && val.length >= 8);
        },
        {
          message: "auth.validation.passwordTooShort",
        },
      ),
    passwordConfirm: z
      .string()
      .optional()
      .refine(
        (val) => {
          return state.guest || val === state.password;
        },
        {
          message: "auth.shared.passwordMismatch",
        },
      ),
    billingAddress: baseAddressSchema.refine(
      (data) => {
        return (
          state.accountType !== "business" ||
          (data.company !== undefined && data.company !== "")
        );
      },
      {
        message: "auth.validation.companyRequired",
        path: ["company"],
      },
    ),
    shippingAddress: baseAddressSchema
      .extend({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        phoneNumber: z.string().optional(),
        street: z.string().optional(),
        city: z.string().optional(),
        zipcode: z.string().optional(),
        countryId: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        if (!state.isShippingAddressDifferent) return;

        const requiredFields: (keyof typeof data)[] = [
          "firstName",
          "lastName",
          "company",
          "phoneNumber",
          "street",
          "city",
        ];

        const fieldMessages: Record<string, string> = {
          firstName: "auth.validation.delivery.firstNameRequired",
          lastName: "auth.validation.delivery.lastNameRequired",
          company: "auth.validation.delivery.companyRequired",
          phoneNumber: "auth.validation.delivery.phoneRequired",
          street: "auth.validation.delivery.streetRequired",
          city: "auth.validation.delivery.cityRequired",
        };

        requiredFields.forEach((field) => {
          if (field === "company" && state.accountType !== "business") return;

          if (!data[field] || data[field] === "") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: fieldMessages[field] || "auth.validation.fieldRequired",
              path: [field],
            });
          } else if (field === "street" && !/[0-9]/.test(data.street || "")) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "auth.validation.streetWithNumber",
              path: ["street"],
            });
          }
        });
      })
      .optional(),
  });

export type RegistrationSchema = z.infer<
  ReturnType<typeof createRegistrationSchema>
>;

export type AddressSchema = z.infer<typeof baseAddressSchema>;
