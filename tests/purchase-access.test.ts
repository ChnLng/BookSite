import { describe, expect, it } from "vitest";
import { bookIdFromDownload } from "../src/lib/purchase-access";

describe("purchase access helpers", () => {
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
});
