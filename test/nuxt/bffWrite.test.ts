import { describe, it, expect } from "vitest";
import { queuedWrite } from "~/utils/bffWrite";

// One queue for every write of the storefront (ADR 0001, step 5): a write
// is sent only after the one before has its answer (and its cookie).
describe("queuedWrite", () => {
  it("sends a write after the answer of the one before, also after a failure", async () => {
    const events: string[] = [];
    let answerFirst!: () => void;
    const first = queuedWrite(async () => {
      events.push("first sent");
      await new Promise<void>((resolve) => (answerFirst = resolve));
      events.push("first answered");
      throw new Error("refused");
    });
    const second = queuedWrite(async () => {
      events.push("second sent");
      return "ok";
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(["first sent"]);
    answerFirst();
    await expect(first).rejects.toThrow("refused");
    expect(await second).toBe("ok");
    expect(events).toEqual(["first sent", "first answered", "second sent"]);
  });
});

describe("a cart write that may still be landing", () => {
  it("is remembered for the next page of the tab for a few seconds", async () => {
    const { noteCartWrite, cartWrittenWithin } =
      await import("~/utils/bffWrite");
    sessionStorage.clear();
    expect(cartWrittenWithin(10_000)).toBe(false);
    noteCartWrite();
    expect(cartWrittenWithin(10_000)).toBe(true);
    sessionStorage.setItem("shopbite-cart-write", String(Date.now() - 20_000));
    expect(cartWrittenWithin(10_000)).toBe(false);
  });
});
