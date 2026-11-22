import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { createError, readBody, type H3Event } from "h3";
import ContactForm from "~/components/Contact/Form.vue";

// Contact form of the presets (#445), through the BFF (ADR 0001, step 7).
const mocks = vi.hoisted(() => ({ contact: vi.fn() }));

registerEndpoint("/api/contact", {
  method: "POST",
  handler: async (event: H3Event) => mocks.contact(await readBody(event)),
});

/** Answers the contact message with `send`. */
function mockSend(send: () => Promise<unknown>) {
  mocks.contact.mockImplementation(send);
}

const sendCalls = () => mocks.contact.mock.calls;

async function fill(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  await wrapper.find('input[name="email"]').setValue("gast@example.de");
  await wrapper.find('input[name="subject"]').setValue("Allergene");
  await wrapper
    .find('textarea[name="comment"]')
    .setValue("Ist der Teig ohne Ei gemacht?");
}

describe("contact form with a preset (#445)", () => {
  beforeEach(() => {
    mocks.contact.mockReset();
    mockSend(async () => ({ confirmation: null }));
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
    mockSend(async () => ({ confirmation: "Danke, wir melden uns." }));
    const wrapper = await mountSuspended(ContactForm);
    await fill(wrapper);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    // the fields the form has, empty ones as not given
    expect(mocks.contact).toHaveBeenCalledWith({
      firstName: null,
      lastName: null,
      email: "gast@example.de",
      phone: null,
      subject: "Allergene",
      message: "Ist der Teig ohne Ei gemacht?",
    });
    await vi.waitFor(() =>
      expect(wrapper.find('[role="status"]').exists()).toBe(true),
    );
    expect(wrapper.find('[role="status"]').text()).toContain(
      "Danke, wir melden uns.",
    );
  });

  it("falls back to the default text and offers another message", async () => {
    mockSend(async () => ({ confirmation: null }));
    const wrapper = await mountSuspended(ContactForm);
    await fill(wrapper);
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() =>
      expect(wrapper.find('[role="status"]').exists()).toBe(true),
    );
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

  it.each([
    [503, "backend_unavailable"],
    [429, "rate_limited"],
    [400, "invalid_value"],
  ])("reports a failed send in the form (%i %s)", async (statusCode, code) => {
    mockSend(() => Promise.reject(createError({ statusCode, data: { code } })));
    const wrapper = await mountSuspended(ContactForm);
    await fill(wrapper);
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() =>
      expect(wrapper.find('[role="alert"]').text()).toContain(
        "konnte nicht gesendet werden",
      ),
    );
  });
});
