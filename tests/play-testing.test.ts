import { describe, expect, it } from "vitest";
import { getPlayTestingApp, getPublicPlayStoreApp, getPublicPlayStoreUrl, playTestingApps, playTestingOptInUrl, playTestingStoreUrl } from "../src/lib/play-testing";

describe("closed testing selection", () => {
  it("recognizes both product IDs and slugs while leaving unrelated paid resources alone", () => {
    const app = getPlayTestingApp("8c237dca-1a31-4e4c-94d4-401d2edad04d");
    expect(app?.packageName).toBe("com.visdar.temps");
    expect(getPlayTestingApp("resource-8c237dca-1a31-4e4c-94d4-401d2edad04d")).toEqual(app);
    expect(getPlayTestingApp("exprimer-le-temps-android")).toEqual(app);
    expect(getPlayTestingApp("pinyin")).toBeNull();
    expect(getPlayTestingApp("lumi")).toBeNull();
    expect(getPlayTestingApp("other-android-app")).toBeNull();
  });
  it("keeps testing opt-in separate from the store link for every listed test app", () => {
    expect(playTestingApps).toHaveLength(4);
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
    expect(getPublicPlayStoreApp("com.visdar.classificateur")?.priceEur).toBe(0);
    expect(getPublicPlayStoreApp("com.visdar.couleurs")?.priceEur).toBe(1.09);
  });
});
