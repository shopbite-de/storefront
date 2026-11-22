import { z } from "zod";

/**
 * Contact form logic (#445, ADR 0001 step 7): the checks and the message
 * to the restaurant through the BFF (`POST /api/contact`), which checks the
 * fields again and hands the message to the backend. The form asks for no
 * salutation; the backend gets "not given".
 */
export const contactFormSchema = z.object({
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
  /**
   * Sends the message and returns the restaurant's confirmation text, or
   * `fallbackMessage`. A filled honeypot pretends success without sending
   * anything (the server ignores it too).
   */
  async function send(data: ContactFormData, fallbackMessage: string) {
    if (data.hp) {
      console.warn("Honeypot filled, submission ignored.");
      return fallbackMessage;
    }
    const answer = await $fetch<{ confirmation: string | null }>(
      "/api/contact",
      {
        method: "POST",
        body: {
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          email: data.email,
          phone: data.phone || null,
          subject: data.subject,
          message: data.comment,
        },
      },
    );
    return answer?.confirmation?.trim() || fallbackMessage;
  }

  return { send };
}
