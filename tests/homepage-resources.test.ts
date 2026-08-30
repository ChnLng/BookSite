import { describe, expect, it } from "vitest";
import { mapHomepageResource } from "../src/lib/homepage-resources";

const row = {
  id: "app-1", slug: "mon-outil", category_id: "android", title_fr: "**Mon outil**",
  homepage_summary_fr: "Une description **courte**.", summary_fr: "Long product details",
  cover_image_url: "/images/app.png", qr_image_url: null, price_eur: "2.09", sort_order: 10,
};

describe("homepage resource summaries", () => {
  it("preserves the public product identity without serializing paid delivery details", () => {
    const result = mapHomepageResource({
      ...row,
      ...{ file_path: "private/release.apk", redemption_code: "DO-NOT-EXPOSE", gallery_images: ["large.png"] },
    });
    expect(result).toMatchObject({
      id: "app-1", slug: "mon-outil", categoryId: "android", titleFr: "Mon outil",
      homepageSummaryFr: "Une description courte.", priceEur: 2.09, downloads: [],
    });
    expect(JSON.stringify(result)).not.toMatch(/private\/|DO-NOT-EXPOSE|large\.png|Long product details/);
  });

  it("uses the existing description and image fallback when homepage fields are empty", () => {
    const result = mapHomepageResource({
      ...row, homepage_summary_fr: null, summary_fr: "Texte ".repeat(100),
      cover_image_url: null, qr_image_url: "/images/fallback.png", price_eur: "0",
    });
    expect(result.homepageSummaryFr.length).toBeLessThanOrEqual(151);
    expect(result.homepageSummaryFr.endsWith("…")).toBe(true);
    expect(result.coverImageUrl).toBe("/images/fallback.png");
    expect(result.priceEur).toBe(0);
  });
});
