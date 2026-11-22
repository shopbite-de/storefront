import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubNitro } from "./nitroStubs";

type Event = {
  headers: Record<string, string>;
  node: { req: unknown };
};

type Refusal = { statusCode: number; data: unknown };

async function readSmall(event: Event, max?: number): Promise<unknown> {
  stubNitro({
    getRequestHeader: (given: Event, name: string) => given.headers[name],
    readBody: async () => "parsed",
  });
  const { readSmallBody } = await import("../../server/utils/requestBody");
  return readSmallBody(event as never, max);
}

const streamed = (text: string, headers: Record<string, string> = {}) => ({
  headers,
  node: { req: Readable.from([Buffer.from(text)]) },
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("readSmallBody", () => {
  it("parses a small JSON body", async () => {
    expect(await readSmall(streamed('{"a":1}'))).toEqual({ a: 1 });
  });

  it("refuses a declared length above the cap before reading", async () => {
    const error = (await readSmall(
      streamed("{}", { "content-length": "11" }),
      10,
    ).catch((failure: Refusal) => failure)) as Refusal;
    expect(error.statusCode).toBe(413);
    expect(error.data).toEqual({ code: "payload_too_large" });
  });

  it("refuses a body that grows above the cap while it streams in", async () => {
    const error = (await readSmall(streamed("x".repeat(100)), 10).catch(
      (failure: Refusal) => failure,
    )) as Refusal;
    expect(error.statusCode).toBe(413);
  });

  it("answers no body for an empty one or no JSON", async () => {
    expect(await readSmall(streamed(""))).toBeUndefined();
    expect(await readSmall(streamed("nicht json"))).toBeUndefined();
  });
});
