import { describe, expect, it } from "vitest";
import { missingPlayResourceRows } from "../src/lib/admin-resource-seeds";

describe("admin Play product import", () => {
  it("creates editable rows for every Play-only page with the correct store link and price", () => {
    const rows = missingPlayResourceRows([]);
    expect(rows).toHaveLength(8);
    expect(new Set(rows.map((row) => row.slug)).size).toBe(rows.length);
    const dictionary = rows.find((row) => row.slug === "dico-contextuel-du-chinois-android");
    expect(dictionary?.price_eur).toBe(2.19);
    expect(dictionary?.external_url).toBe("https://play.google.com/store/apps/details?id=com.visdar.contextes");
    expect(rows.find((row) => row.slug === "trace-des-sinogrammes-android")?.gallery_images).toHaveLength(3);
  });

  it("never overwrites a product already managed in Supabase", () => {
    const rows = missingPlayResourceRows(["dico-contextuel-du-chinois-android", "chinois-en-binome-android"]);
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.slug)).not.toContain("dico-contextuel-du-chinois-android");
    expect(rows.map((row) => row.slug)).not.toContain("chinois-en-binome-android");
  });
});
