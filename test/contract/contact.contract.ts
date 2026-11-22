import { describe, expect, it } from "vitest";
import {
  isDomainError,
  type ContactForm,
  type ContactMessage,
  type DomainError,
} from "../../shared/domain";
import type { Backend } from "../../server/ports";

/** The restaurant's contact settings, in domain terms. */
export type ContactScenario = Readonly<{
  /** The restaurant's own confirmation text, or none. */
  confirmation: string | null;
  /** Fields the restaurant requires beside e-mail, subject and message. */
  required?: Partial<ContactForm["required"]>;
}>;

/** A message as the restaurant received it, with the sender's address. */
export type ReceivedMessage = ContactMessage &
  Readonly<{ forwardedFor: string | undefined }>;

export type ContactFixture = Readonly<{
  adapter: string;
  create: (scenario: ContactScenario) => {
    backend: Backend;
    received: () => readonly ReceivedMessage[];
  };
}>;

export const MESSAGE: ContactMessage = {
  salutation: null,
  firstName: "Erika",
  lastName: "Muster",
  email: "erika@example.com",
  phone: "0123 456789",
  subject: "Allergene",
  message: "Ist der Teig ohne Ei gemacht?\nDanke!",
};

const VISITOR = { forwardedFor: "203.0.113.7" };
const NEIGHBOUR = { forwardedFor: "198.51.100.23" };

async function refusal(call: () => Promise<unknown>): Promise<DomainError> {
  try {
    await call();
  } catch (error) {
    if (isDomainError(error)) return error;
    throw error;
  }
  throw new Error("expected the call to fail");
}

export function runContactContract(fixtures: readonly ContactFixture[]): void {
  for (const fixture of fixtures) {
    describe(`contact contract [${fixture.adapter}]`, () => {
      it("hands the message to the restaurant", async () => {
        const { backend, received } = fixture.create({ confirmation: null });

        const answer = await backend.contact.send(MESSAGE, VISITOR);

        expect(answer).toEqual({ confirmation: null });
        expect(received()).toEqual([{ ...MESSAGE, ...VISITOR }]);
      });

      it("sends a message with only the fields the form requires", async () => {
        const { backend, received } = fixture.create({ confirmation: null });
        const bare: ContactMessage = {
          salutation: null,
          firstName: null,
          lastName: null,
          email: "gast@example.com",
          phone: null,
          subject: "Frage",
          message: "Haben Sie heute geöffnet?",
        };

        await backend.contact.send(bare, VISITOR);

        expect(received()).toEqual([{ ...bare, ...VISITOR }]);
      });

      it("answers the restaurant's own confirmation text", async () => {
        const { backend } = fixture.create({
          confirmation: "Danke, wir melden uns heute noch.",
        });
        expect(await backend.contact.send(MESSAGE, VISITOR)).toEqual({
          confirmation: "Danke, wir melden uns heute noch.",
        });
      });

      it("limits messages per visitor address, not for another one", async () => {
        const { backend, received } = fixture.create({ confirmation: null });
        for (let sent = 0; sent < 3; sent++) {
          await backend.contact.send(MESSAGE, VISITOR);
        }

        const limited = await refusal(() =>
          backend.contact.send(MESSAGE, VISITOR),
        );

        expect(limited.code).toBe("rate_limited");
        expect(limited.details.retryAfterSeconds).toBeGreaterThan(0);
        await backend.contact.send(MESSAGE, NEIGHBOUR);
        expect(received()).toHaveLength(4);
      });

      it("names no further required field by default", async () => {
        const { backend } = fixture.create({ confirmation: null });
        expect(await backend.contact.getForm()).toEqual({
          required: { firstName: false, lastName: false, phone: false },
        });
      });

      it("names the fields the restaurant requires and refuses a message without them", async () => {
        const { backend, received } = fixture.create({
          confirmation: null,
          required: { firstName: true, lastName: true, phone: true },
        });
        expect(await backend.contact.getForm()).toEqual({
          required: { firstName: true, lastName: true, phone: true },
        });

        const refused = await refusal(() =>
          backend.contact.send(
            { ...MESSAGE, lastName: null, phone: null },
            VISITOR,
          ),
        );

        expect(refused.code).toBe("validation_failed");
        expect([...(refused.details.fields as string[])].sort()).toEqual([
          "lastName",
          "phone",
        ]);
        expect(received()).toEqual([]);
        await backend.contact.send(MESSAGE, VISITOR);
        expect(received()).toHaveLength(1);
      });

      it("answers a value a caller cannot change", async () => {
        const { backend } = fixture.create({ confirmation: null });
        expect(
          Object.isFrozen(await backend.contact.send(MESSAGE, VISITOR)),
        ).toBe(true);
        expect(Object.isFrozen(await backend.contact.getForm())).toBe(true);
      });
    });
  }
}
