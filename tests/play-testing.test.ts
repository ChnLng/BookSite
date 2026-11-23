import { describe, expect, it } from "vitest";
import { getPlayTestingApp, getPublicPlayStoreApp, getPublicPlayStoreUrl, playTestingApps, playTestingOptInUrl, playTestingStoreUrl } from "../src/lib/play-testing";

describe("closed testing selection", () => {
  it("does not route published apps through the closed-test flow", () => {
    expect(getPlayTestingApp("8c237dca-1a31-4e4c-94d4-401d2edad04d")).toBeNull();
    expect(getPlayTestingApp("exprimer-le-temps-android")).toBeNull();
    expect(getPlayTestingApp("pinyin")).toBeNull();
    expect(getPlayTestingApp("lumi")).toBeNull();
    expect(getPlayTestingApp("other-android-app")).toBeNull();
  });
  it("keeps testing opt-in separate from the store link for every listed test app", () => {
    expect(playTestingApps).toHaveLength(0);
    for (const app of playTestingApps) {
      expect(app.priceEur).toBeGreaterThan(0);
      expect(new URL(playTestingOptInUrl(app)).pathname).toBe(`/apps/testing/${app.packageName}`);
      expect(new URL(playTestingStoreUrl(app)).searchParams.get("id")).toBe(app.packageName);
    }
  });

  it("keeps publicly launched apps out of testing and gives their direct store URLs", () => {
    expect(getPlayTestingApp("roue-chromatique-se-pan-android-en-chinois")).toBeNull();
    expect(getPlayTestingApp("com.visdar.dialectes")).toBeNull();
    expect(getPublicPlayStoreUrl("reconnaissance-de-sinogrammes-manuscrits-android")).toBe("https://play.google.com/store/apps/details?id=com.visdar.manuscrits");
    expect(getPublicPlayStoreUrl("com.visdar.cles")).toBe("https://play.google.com/store/apps/details?id=com.visdar.cles");
    expect(getPublicPlayStoreUrl("chinois-en-binome-android")).toBe("https://play.google.com/store/apps/details?id=com.visdar.binome");
    expect(getPublicPlayStoreApp("com.visdar.classificateur")?.priceEur).toBe(2.09);
    expect(getPublicPlayStoreApp("com.visdar.couleurs")?.priceEur).toBe(1.09);
    expect(getPublicPlayStoreUrl("exprimer-le-temps-android")).toBe("https://play.google.com/store/apps/details?id=com.visdar.temps");
    expect(getPublicPlayStoreUrl("expressions-idiomatiques-android")).toBe("https://play.google.com/store/apps/details?id=com.visdar.expressions");
    expect(getPublicPlayStoreUrl("dico-contextuel-du-chinois-android")).toBe("https://play.google.com/store/apps/details?id=com.visdar.contextes");
    expect(getPublicPlayStoreUrl("titres-de-parente-android")).toBe("https://play.google.com/store/apps/details?id=com.visdar.famille");
    expect(getPublicPlayStoreUrl("trace-des-sinogrammes-android")).toBe("https://play.google.com/store/apps/details?id=com.visdar.stroke");
  });
});
