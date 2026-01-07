// schemas/registrationSchema.ts
import * as z from "zod";

const baseAddressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  salutationId: z.string().optional(),
  street: z
    .string()
    .min(1, { message: "Bitte geben Sie Ihre Straße und Hausnummer an." })
    .refine((val) => /[0-9]/.test(val), {
      message: "Bitte geben Sie Ihre Straße und Hausnummer an.",
    }),
  additionalAddressLine1: z.string().optional(),
  zipcode: z.string().optional(),
  city: z.string().min(1, {
    message: "Bitte geben Sie Ihren Ort an.",
  }),
  countryId: z.string().min(1, { message: "Bitte wählen Sie ein Land aus." }),
  phoneNumber: z.string().min(7, {
    message: "Bitte geben Sie eine gültige Telefonnummer an (mind. 7 Zeichen).",
  }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createRegistrationSchema = (state: any) =>
  z.object({
    accountType: z.enum(["private", "business"], {
      errorMap: () => ({ message: "Bitte wählen Sie einen Kontotyp aus." }),
    }),
    email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
    firstName: z
      .string()
      .min(1, { message: "Bitte geben Sie Ihren Vornamen an." }),
    lastName: z
      .string()
      .min(1, { message: "Bitte geben Sie Ihren Nachnamen an." }),
    guest: z.boolean(),
    acceptedDataProtection: z.boolean().refine((val) => val, {
      message: "Bitte akzeptieren Sie die Datenschutzbestimmungen.",
    }),
    storefrontUrl: z.string().optional(),
    password: z
      .string()
      .optional()
      .refine(
        (val) => {
          return state.guest || (val && val.length >= 8);
        },
        {
          message: "Das Passwort muss mindestens 8 Zeichen lang sein.",
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
          message: "Die Passwörter stimmen nicht überein.",
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
        message: "Als Geschäftskunde ist der Firmenname ein Pflichtfeld.",
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
          firstName: "Bitte geben Sie den Vornamen für die Lieferadresse an.",
          lastName: "Bitte geben Sie den Nachnamen für die Lieferadresse an.",
          company: "Bitte geben Sie den Firmennamen für die Lieferadresse an.",
          phoneNumber:
            "Bitte geben Sie eine Telefonnummer für die Lieferadresse an.",
          street: "Bitte geben Sie die Straße für die Lieferadresse an.",
          city: "Bitte geben Sie den Ort für die Lieferadresse an.",
        };

        requiredFields.forEach((field) => {
          if (field === "company" && state.accountType !== "business") return;

          if (!data[field] || data[field] === "") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: fieldMessages[field] || "Dieses Feld ist erforderlich.",
              path: [field],
            });
          } else if (field === "street" && !/[0-9]/.test(data.street || "")) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Bitte geben Sie Ihre Straße und Hausnummer an.",
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
