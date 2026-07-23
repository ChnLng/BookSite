import { describe, expect, it } from "vitest";
import { books, donationOptions } from "../src/data/books";

describe("Visd AR seed data", () => {
  it("exposes four launch books", () => {
    expect(books).toHaveLength(4);
  });

  it("keeps cute donation tiers", () => {
    expect(donationOptions.map((item) => item.label)).toEqual([
      "Petit Nuage",
      "Coup de Patte",
      "Etoile Douce",
    ]);
  });
});
