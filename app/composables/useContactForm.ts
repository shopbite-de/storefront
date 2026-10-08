import { z } from "zod";
import { useSalutations } from "@shopware/composables";

/**
 * Contact form logic shared by the Nuxt UI form and the preset form
 * (#445): salutation options, the checks and the Store API call.
 */
export const contactFormSchema = z.object({
  salutationId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z.string().optional(),
  subject: z.string().min(3, "Bitte gib einen Betreff an"),
  comment: z
    .string()
    .min(10, "Die Nachricht muss mindestens 10 Zeichen lang sein"),
  hp: z.string().optional(),
});

export type ContactFormData = z.output<typeof contactFormSchema>;

export function useContactForm() {
  const { apiClient } = useShopwareContext();
  const { getSalutations } = useSalutations();

  const salutations = computed(() =>
    getSalutations.value.map((salutation) => ({
      label: salutation.displayName ?? "",
      value: salutation.id,
    })),
  );

  /**
   * Sends the message and returns the success text of the shop. A filled
   * honeypot pretends success without sending anything.
   */
  async function send(data: ContactFormData, fallbackMessage: string) {
    if (data.hp) {
      console.warn("Honeypot filled, submission ignored.");
      return fallbackMessage;
    }
    const result = await apiClient.invoke(
      "sendContactMail post /contact-form",
      {
        body: {
          salutationId: data.salutationId || salutations.value.at(-1)?.value,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          subject: data.subject,
          comment: data.comment,
        },
      },
    );
    const resultData = result?.data as Record<string, unknown> | undefined;
    const message =
      typeof resultData?.individualSuccessMessage === "string"
        ? resultData.individualSuccessMessage.trim()
        : "";
    return message || fallbackMessage;
  }

  return { salutations, send };
}
