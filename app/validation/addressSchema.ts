// schemas/registrationSchema.ts
import * as z from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createAddressSchema = (state: any) =>
  z.object({
    id: z.string().optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    accountType: z.string().min(1).optional(),
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
    zipcode: z.string().min(1),
    city: z.string().min(1),
    countryId: z.string().min(1),
    phoneNumber: z.string().min(7),
    additionalAddressLine1: z.string().optional(),
  });

export type AddressSchema = z.infer<ReturnType<typeof createAddressSchema>>;
