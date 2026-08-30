import { describe, expect, it } from "vitest";
import { advertisingConsentLifetime, isAdvertisingHost, readAdvertisingChoice } from "../src/lib/advertising";

describe("advertising consent", () => {
  const now = 1_800_000_000_000;
  const stored = (choice: string, savedAt = now, version = 1) => JSON.stringify({ choice, savedAt, version });
  it("defaults to no consent for missing, expired, future or unrecognized records", () => {
    for (const raw of [null, "{broken", stored("accepted", now - advertisingConsentLifetime), stored("accepted", now + 1), stored("accepted", now, 2), stored("yes")]) {
      expect(readAdvertisingChoice(raw, now)).toBeNull();
    }
  });
  it("remembers acceptance and refusal for the same duration", () => {
    expect(readAdvertisingChoice(stored("accepted", now - 1000), now)).toBe("accepted");
    expect(readAdvertisingChoice(stored("rejected", now - 1000), now)).toBe("rejected");
  });
  it("does not send real ad requests from development or unapproved hosts", () => {
    expect(isAdvertisingHost("www.visdar.fr")).toBe(true);
    expect(isAdvertisingHost("visdar.fr")).toBe(true);
    for (const host of ["127.0.0.1", "localhost", "booksite.vercel.app", "www.visdar.fr.example.com"]) expect(isAdvertisingHost(host)).toBe(false);
  });
});
