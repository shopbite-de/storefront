import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import ContactForm from "~/components/Contact/Form.vue";

type ContactFormVm = {
  submitted: boolean;
  successMessage: string;
  onSubmit: (arg: {
    data: Record<string, string | undefined>;
  }) => Promise<void>;
};

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal("$fetch", mockFetch);

const mockToastAdd = vi.fn();
mockNuxtImport("useToast", () => () => ({
  add: mockToastAdd,
}));

// Default: salutations call returns empty array, contact call succeeds
function setupFetchMocks(
  contactResponse: unknown = { individualSuccessMessage: "" },
) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url === "/api/salutations") {
      return [
        { id: "1", displayName: "Herr" },
        { id: "2", displayName: "Frau" },
      ];
    }
    if (url === "/api/contact") {
      return contactResponse;
    }
    return null;
  });
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetchMocks();
  });

  it("submits the form and shows success message component with custom individualSuccessMessage", async () => {
    const customMessage = "Vielen Dank für deine Nachricht!";
    setupFetchMocks({ individualSuccessMessage: customMessage });

    const wrapper = await mountSuspended(ContactForm);

    const validData = {
      salutationId: "1",
      firstName: "Max",
      lastName: "Mustermann",
      email: "max@example.com",
      phone: "01234 567890",
      subject: "Frage zum Produkt",
      comment: "Ich habe eine Frage zu Ihrem Produkt.",
    };

    await (wrapper.vm as unknown as ContactFormVm).onSubmit({
      data: validData,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        description: customMessage,
        color: "success",
      }),
    );

    // Verify submitted state
    expect((wrapper.vm as unknown as ContactFormVm).submitted).toBe(true);
    expect((wrapper.vm as unknown as ContactFormVm).successMessage).toBe(
      customMessage,
    );

    // Wait for DOM update
    await nextTick();

    // Check if success message is displayed in the template
    expect(wrapper.text()).toContain(customMessage);
    expect(wrapper.text()).toContain("Weiteres Formular senden");
    expect(wrapper.find("form").exists()).toBe(false);

    // Click on "Weiteres Formular senden"
    await wrapper.find("button").trigger("click");
    expect((wrapper.vm as unknown as ContactFormVm).submitted).toBe(false);

    await nextTick();
    expect(wrapper.find("form").exists()).toBe(true);
  });

  it("submits the form and shows default success message if individualSuccessMessage is empty", async () => {
    setupFetchMocks({ individualSuccessMessage: "" });

    const wrapper = await mountSuspended(ContactForm);

    const validData = {
      salutationId: "1",
      firstName: "Max",
      lastName: "Mustermann",
      email: "max@example.com",
      phone: "01234 567890",
      subject: "Frage zum Produkt",
      comment: "Ich habe eine Frage zu Ihrem Produkt.",
    };

    await (wrapper.vm as unknown as ContactFormVm).onSubmit({
      data: validData,
    });

    const defaultMessage = "Deine Nachricht wurde erfolgreich versendet.";
    expect((wrapper.vm as unknown as ContactFormVm).successMessage).toBe(
      defaultMessage,
    );

    await nextTick();
    expect(wrapper.text()).toContain(defaultMessage);
  });

  it("submits the form with only mandatory fields", async () => {
    setupFetchMocks({ individualSuccessMessage: "" });

    const wrapper = await mountSuspended(ContactForm);

    const mandatoryDataOnly = {
      email: "test@example.com",
      subject: "Nur Betreff",
      comment: "Dies ist ein Test mit nur Pflichtfeldern.",
    };

    await (wrapper.vm as unknown as ContactFormVm).onSubmit({
      data: mandatoryDataOnly,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          email: "test@example.com",
          subject: "Nur Betreff",
          comment: "Dies ist ein Test mit nur Pflichtfeldern.",
        }),
      }),
    );

    expect((wrapper.vm as unknown as ContactFormVm).submitted).toBe(true);
  });

  it("shows error toast when submission fails", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === "/api/salutations") return [];
      throw new Error("Network error");
    });

    const wrapper = await mountSuspended(ContactForm);

    const validData = {
      salutationId: "2",
      firstName: "Erika",
      lastName: "Musterfrau",
      email: "erika@example.com",
      phone: "09876 54321",
      subject: "Supportanfrage",
      comment: "Bitte um Unterstützung.",
    };

    await (wrapper.vm as unknown as ContactFormVm).onSubmit({
      data: validData,
    });

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Fehler!",
        color: "error",
      }),
    );
  });

  it("does not call API but marks form as submitted when honeypot is filled", async () => {
    const wrapper = await mountSuspended(ContactForm);
    const fetchCallsBefore = mockFetch.mock.calls.length;

    const botData = {
      email: "bot@example.com",
      subject: "Bot request",
      comment: "This is spam.",
      hp: "I am a bot",
    };
    await (wrapper.vm as unknown as ContactFormVm).onSubmit({ data: botData });

    // No additional $fetch calls for /api/contact
    const contactCalls = mockFetch.mock.calls
      .slice(fetchCallsBefore)
      .filter((call) => call[0] === "/api/contact");
    expect(contactCalls).toHaveLength(0);
    expect((wrapper.vm as unknown as ContactFormVm).submitted).toBe(true);
  });
});
