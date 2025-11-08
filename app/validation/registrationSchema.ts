// schemas/registrationSchema.ts
import * as z from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createRegistrationSchema = (state: any) =>
  z.object({
    accountType: z.string(),
    email: z.string().email("Invalid email"),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    guest: z.boolean(),
    password: z
      .string()
      .optional()
      .refine(
        (val) => {
          return state.guest || (val && val.length >= 8);
        },
        {
          message: "Password muss mindestens 8 Zeichen lang sein.",
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
          message: "Password stimmt nicht überein.",
        },
      ),
    billingAddress: z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      company: z
        .string()
        .optional()
        .refine(
          (val) => {
            return (
              state.accountType !== "commercial" ||
              (val !== undefined && val !== "")
            );
          },
          {
            message: "Als Geschäftskunde ist dieses Feld pflicht.",
          },
        ),
      department: z.string().optional(),
      street: z.string().min(1),
      zipcode: z.string().min(1).optional(),
      city: z.string().min(1, {
        message: "Bitte geben Sie den Ort an.",
      }),
      countryId: z.string().min(1),
      phoneNumber: z.string().min(7),
    }),
    shippingAddress: z.object({
      firstName: z
        .string()
        .min(1)
        .optional()
        .refine(
          (val) => {
            return (
              !state.isShippingAddressDifferent ||
              (val !== undefined && val !== "")
            );
          },
          {
            message: "Erforderlich.",
          },
        ),
      lastName: z
        .string()
        .min(1)
        .optional()
        .refine(
          (val) => {
            return (
              !state.isShippingAddressDifferent ||
              (val !== undefined && val !== "")
            );
          },
          {
            message: "Erforderlich.",
          },
        ),
      company: z
        .string()
        .min(1)
        .optional()
        .refine(
          (val) => {
            return (
              !state.isShippingAddressDifferent ||
              (val !== undefined && val !== "")
            );
          },
          {
            message: "Erforderlich.",
          },
        ),
      department: z.string().optional(),
      phoneNumber: z
        .string()
        .optional()
        .refine(
          (val) => {
            return (
              !state.isShippingAddressDifferent ||
              (val !== undefined && val !== "")
            );
          },
          {
            message: "Erforderlich.",
          },
        ),
      street: z
        .string()
        .optional()
        .refine(
          (val) => {
            return (
              !state.isShippingAddressDifferent ||
              (val !== undefined && val !== "")
            );
          },
          {
            message: "Erforderlich.",
          },
        ),
      zipcode: z.string().min(1).optional(),
      city: z
        .string()
        .optional()
        .refine(
          (val) => {
            return (
              !state.isShippingAddressDifferent ||
              (val !== undefined && val !== "")
            );
          },
          {
            message: "Erforderlich.",
          },
        ),
      countryId: z.string().min(1),
    }),
  });

export type RegistrationSchema = z.infer<
  ReturnType<typeof createRegistrationSchema>
>;
