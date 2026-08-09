import { describe, expect, it } from "vitest";
import {
  canViewMimeType,
  deliveryModeAllowed,
  extensionFromFilename,
  normalizeAllowedFileTypes,
} from "../src/lib/product-documents";

describe("product document rules", () => {
  it("normalizes administrator file-extension rules", () => {
    expect(normalizeAllowedFileTypes(["PDF", ".svg", "pdf", " bad value "])).toEqual([".pdf", ".svg"]);
    expect(extensionFromFilename("modèle.final.GLB")).toBe(".glb");
  });

  it("allows browser viewing only for safe directly-renderable formats", () => {
    expect(canViewMimeType("application/pdf", ".pdf")).toBe(true);
    expect(canViewMimeType("image/svg+xml", ".svg")).toBe(true);
    expect(canViewMimeType("model/gltf-binary", ".glb")).toBe(false);
    expect(canViewMimeType("application/zip", ".zip")).toBe(false);
  });

  it("requires both category permissions for view-and-download delivery", () => {
    expect(deliveryModeAllowed("both", ["download", "view"])).toBe(true);
    expect(deliveryModeAllowed("both", ["download"])).toBe(false);
  });
});
