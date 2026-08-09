import { describe, expect, it } from "vitest";
import { isUuid } from "../src/lib/database-identifiers";
import { bookIdFromDownload, resourceDownloadMatches } from "../src/lib/purchase-access";

describe("purchase access helpers", () => {
  it("distinguishes database UUIDs from public product slugs", () => {
    expect(isUuid("a64cfd8d-8ca3-42bd-8355-6a6d8d5f72bf")).toBe(true);
    expect(isUuid("echecschinois")).toBe(false);
  });

  it("returns book_id when present", () => {
    expect(
      bookIdFromDownload({
        book_id: "lumi",
        download_url: "/images/lumi_book.pdf",
      }),
    ).toBe("lumi");
  });

  it("derives book id from download_url when book_id is missing", () => {
    expect(
      bookIdFromDownload({
        book_id: null,
        download_url: "/images/jiti_book.pdf",
      }),
    ).toBe("jiti");
  });

  it("returns null when no book reference exists", () => {
    expect(
      bookIdFromDownload({
        book_id: null,
        download_url: null,
      }),
    ).toBeNull();
  });

  it("matches a current resource purchase by UUID", () => {
    expect(resourceDownloadMatches({
      download_kind: "resource",
      resource_id: "resource-uuid",
      payment_status: "paid",
    }, ["resource-uuid", "echecschinois"])).toBe(true);
  });

  it("matches a legacy resource purchase saved with its slug", () => {
    expect(resourceDownloadMatches({
      download_kind: "resource",
      resource_id: null,
      resource_title: "Jeu d'échecs chinois",
      book_id: "echecschinois",
      payment_status: "paid",
    }, ["resource-uuid", "echecschinois"])).toBe(true);
  });

  it("does not restore access to refunded resources", () => {
    expect(resourceDownloadMatches({
      download_kind: "resource",
      resource_id: "resource-uuid",
      payment_status: "refunded",
    }, ["resource-uuid"])).toBe(false);
  });
});
