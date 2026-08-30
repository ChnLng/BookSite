import { describe, expect, it } from "vitest";
import { selectLatestProducts, type LatestProductRow } from "../src/lib/latest-products";

function product(id: string, createdAt: string | null, overrides: Partial<LatestProductRow> = {}): LatestProductRow {
  return { id, slug: id, title_fr: id, price_eur: 5.99, visible: true, deleted_at: null, created_at: createdAt, ...overrides };
}

describe("homepage latest products", () => {
  it("selects the newest two across books and resources, regardless of catalogue order", () => {
    const result = selectLatestProducts(
      [product("older", "2026-07-01"), product("new-book", "2026-08-28")],
      [product("new-tool", "2026-08-30"), product("old-tool", "2026-08-01")],
    );
    expect(result.map((item) => item.href)).toEqual(["/outils/new-tool", "/livres/new-book"]);
  });

  it("does not promote hidden, deleted, or undated products", () => {
    const result = selectLatestProducts([
      product("hidden", "2026-08-30", { visible: false }),
      product("deleted", "2026-08-30", { deleted_at: "2026-08-30" }),
      product("undated", null), product("invalid-date", "invalid"),
      product("public", "2026-08-01"),
    ], []);
    expect(result.map((item) => item.id)).toEqual(["book-public"]);
    expect(selectLatestProducts([], [])).toEqual([]);
  });

  it("allows both latest products to come from the same category", () => {
    expect(selectLatestProducts([product("book", "2026-07-01")], [
      product("tool-a", "2026-08-30"), product("tool-b", "2026-08-29"),
    ]).map((item) => item.id)).toEqual(["resource-tool-a", "resource-tool-b"]);
  });

  it("uses the public slug, cleans formatting, and preserves free pricing", () => {
    const [result] = selectLatestProducts([], [product("uuid", "2026-08-30", {
      slug: "outil-français", title_fr: "**Mon outil**", price_eur: "0", qr_image_url: "/images/tool.png",
    })]);
    expect(result).toMatchObject({ title: "Mon outil", priceEur: 0, image: "/images/tool.png", href: "/outils/outil-fran%C3%A7ais" });
  });
});
