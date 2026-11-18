import { describe, expect, it } from "vitest";
import { trackingUrl } from "../../app/utils/trackingUrl";

describe("trackingUrl", () => {
  it("keeps a plain path", () => {
    expect(trackingUrl("/Speisekarte/Pizza/")).toBe("/Speisekarte/Pizza/");
  });

  it("drops query parameters that may carry secrets", () => {
    expect(trackingUrl("/account/recover/password?hash=abc123")).toBe(
      "/account/recover/password",
    );
    expect(trackingUrl("/registrierung/bestaetigen?em=e1&hash=h1")).toBe(
      "/registrierung/bestaetigen",
    );
    expect(
      trackingUrl("/bestellung/1?token=t&deepLinkCode=d&email=a@b.c"),
    ).toBe("/bestellung/1");
  });

  it("drops the fragment", () => {
    expect(trackingUrl("/konto#access_token=x")).toBe("/konto");
    expect(trackingUrl("/?produkt=P1#x")).toBe("/?produkt=P1");
  });

  it("keeps campaign parameters and the quick view configuration", () => {
    expect(
      trackingUrl(
        "/Speisekarte/Pizza/?produkt=P1&ohne=Zwiebeln&extras=E1&hash=x",
      ),
    ).toBe("/Speisekarte/Pizza/?produkt=P1&ohne=Zwiebeln&extras=E1");
    expect(
      trackingUrl(
        "/?utm_source=flyer&utm_medium=print&mtm_campaign=a&pk_kwd=b&em=x",
      ),
    ).toBe("/?utm_source=flyer&utm_medium=print&mtm_campaign=a&pk_kwd=b");
  });

  it("matches parameter names exactly, not by prefix", () => {
    expect(trackingUrl("/?produkt_hash=x&extrasToken=y&utm=z")).toBe("/");
  });

  it("keeps encoded values as they are", () => {
    expect(trackingUrl("/?ohne=K%C3%A4se&extras=E1%2CE2")).toBe(
      "/?ohne=K%C3%A4se&extras=E1%2CE2",
    );
  });
});
