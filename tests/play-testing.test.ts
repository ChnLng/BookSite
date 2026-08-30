import { describe, expect, it } from "vitest";
import { getPlayTestingApp, playTestingApps, playTestingOptInUrl, playTestingStoreUrl } from "../src/lib/play-testing";

describe("closed testing selection", () => {
  it("recognizes both product IDs and slugs while leaving unrelated paid resources alone", () => {
    const app = getPlayTestingApp("a96d2feb-6bd6-4ce0-a61d-118d0e0c65ac");
    expect(app?.packageName).toBe("com.visdar.couleurs");
    expect(getPlayTestingApp("resource-a96d2feb-6bd6-4ce0-a61d-118d0e0c65ac")).toEqual(app);
    expect(getPlayTestingApp("roue-chromatique-se-pan-android-en-chinois")).toEqual(app);
    expect(getPlayTestingApp("pinyin")).toBeNull();
    expect(getPlayTestingApp("lumi")).toBeNull();
    expect(getPlayTestingApp("other-android-app")).toBeNull();
  });
  it("keeps testing opt-in separate from the store link for each of the five apps", () => {
    expect(playTestingApps).toHaveLength(5);
    for (const app of playTestingApps) {
      expect(new URL(playTestingOptInUrl(app)).pathname).toBe(`/apps/testing/${app.packageName}`);
      expect(new URL(playTestingStoreUrl(app)).searchParams.get("id")).toBe(app.packageName);
    }
  });
});
