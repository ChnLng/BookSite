import { describe, expect, it } from "vitest";
import { getExternalLinkLabel } from "../src/lib/external-link-label";

describe("getExternalLinkLabel", () => {
  it("uses the Google Play Store label for Play Store URLs", () => {
    expect(getExternalLinkLabel("https://play.google.com/store/apps/details?id=com.visdar.cles")).toBe("Google Play Store");
  });

  it("uses the Amazon label for Amazon URLs", () => {
    expect(getExternalLinkLabel("https://www.amazon.fr/dp/example")).toBe("Amazon");
    expect(getExternalLinkLabel("https://amzn.to/example")).toBe("Amazon");
  });

  it("keeps the supplied fallback for other and invalid URLs", () => {
    expect(getExternalLinkLabel("https://visdar.fr/catalogue")).toBe("Lien externe");
    expect(getExternalLinkLabel("not a URL", "Ouvrir")).toBe("Ouvrir");
  });
});
