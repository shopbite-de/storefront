import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import ContactFormPreset from "~/components/Contact/FormPreset.vue";

// Contact form of the presets (#445).
const SEND = "sendContactMail post /contact-form";
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), send: vi.fn() }));

mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke: mocks.invoke },
}));

const sendCalls = () =>
  mocks.invoke.mock.calls.filter(([operation]) => operation === SEND);

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
    mocks.send.mockReset();
    // the salutations load on mount; only the send is controlled per test
    mocks.invoke.mockImplementation((operation: string, ...args: unknown[]) =>
      operation === SEND
        ? mocks.send(...args)
        : Promise.resolve({ data: { elements: [] } }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("checks the fields before sending", async () => {
    const wrapper = await mountSuspended(ContactFormPreset);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("Bitte geben Sie eine gültige E-Mail");
    expect(wrapper.text()).toContain("Bitte geben Sie einen Betreff an.");
    expect(wrapper.text()).toContain("mindestens 10 Zeichen");
    expect(sendCalls()).toHaveLength(0);
  });

  it("sends the message and shows the shop's success text", async () => {
    mocks.send.mockResolvedValue({
      data: { individualSuccessMessage: "Danke, wir melden uns." },
    });
    const wrapper = await mountSuspended(ContactFormPreset);
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

  it("ignores a filled honeypot without sending", async () => {
    const wrapper = await mountSuspended(ContactFormPreset);
    await fill(wrapper);
    await wrapper.find('input[name="hp"]').setValue("bot");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(sendCalls()).toHaveLength(0);
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it("reports a failed send in the form", async () => {
    mocks.send.mockRejectedValue(new Error("500"));
    const wrapper = await mountSuspended(ContactFormPreset);
    await fill(wrapper);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain(
      "konnte nicht gesendet werden",
    );
  });
});
