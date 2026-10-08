import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import ContactForm from "~/components/Contact/Form.vue";

// Contact form of the presets (#445).
const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke: mocks.invoke },
}));

const salutations = {
  data: { elements: [{ id: "sal-none", displayName: "Keine Angabe" }] },
};

/** Answers the salutation request and lets `send` handle the contact mail. */
function mockSend(send: () => Promise<unknown>) {
  mocks.invoke.mockImplementation(async (operation: string) =>
    operation.includes("salutation") ? salutations : send(),
  );
}

const sendCalls = () =>
  mocks.invoke.mock.calls.filter(
    ([operation]) => operation === "sendContactMail post /contact-form",
  );

async function fill(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  await wrapper.find('input[name="email"]').setValue("gast@example.de");
  await wrapper.find('input[name="subject"]').setValue("Allergene");
  await wrapper
    .find('textarea[name="comment"]')
    .setValue("Ist der Teig ohne Ei gemacht?");
}

describe("contact form with a preset (#445)", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mockSend(async () => ({ data: {} }));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("checks the fields before sending", async () => {
    const wrapper = await mountSuspended(ContactForm);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("Bitte geben Sie eine gültige E-Mail");
    expect(wrapper.text()).toContain("Bitte geben Sie einen Betreff an.");
    expect(wrapper.text()).toContain("mindestens 10 Zeichen");
    expect(sendCalls()).toHaveLength(0);
  });

  it("sends the message and shows the shop's success text", async () => {
    mockSend(async () => ({
      data: { individualSuccessMessage: "Danke, wir melden uns." },
    }));
    const wrapper = await mountSuspended(ContactForm);
    await fill(wrapper);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(mocks.invoke).toHaveBeenCalledWith(
      "sendContactMail post /contact-form",
      expect.objectContaining({
        body: expect.objectContaining({
          email: "gast@example.de",
          subject: "Allergene",
        }),
      }),
    );
    expect(wrapper.find('[role="status"]').text()).toContain(
      "Danke, wir melden uns.",
    );
  });

  it("falls back to the default text and offers another message", async () => {
    mockSend(async () => ({ data: { individualSuccessMessage: " " } }));
    const wrapper = await mountSuspended(ContactForm);
    await fill(wrapper);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    const status = wrapper.find('[role="status"]');
    expect(status.text()).toContain(
      "Vielen Dank, Ihre Nachricht ist bei uns angekommen.",
    );
    expect(wrapper.find("form").exists()).toBe(false);

    await status.find("button").trigger("click");
    expect(wrapper.find("form").exists()).toBe(true);
    expect(
      (wrapper.find('input[name="email"]').element as HTMLInputElement).value,
    ).toBe("");
  });

  it("ignores a filled honeypot without sending", async () => {
    const wrapper = await mountSuspended(ContactForm);
    await fill(wrapper);
    await wrapper.find('input[name="hp"]').setValue("bot");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(sendCalls()).toHaveLength(0);
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it("reports a failed send in the form", async () => {
    mockSend(() => Promise.reject(new Error("500")));
    const wrapper = await mountSuspended(ContactForm);
    await fill(wrapper);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain(
      "konnte nicht gesendet werden",
    );
  });
});
