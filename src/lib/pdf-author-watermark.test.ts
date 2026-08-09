import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addVisdArAuthorWatermark, isPdfUpload } from "./pdf-author-watermark";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PDF author watermark", () => {
  it("recognizes PDF uploads", () => {
    expect(isPdfUpload({ name: "cours.PDF", type: "" })).toBe(true);
    expect(isPdfUpload({ name: "cours.bin", type: "application/pdf" })).toBe(true);
    expect(isPdfUpload({ name: "modele.svg", type: "image/svg+xml" })).toBe(false);
  });

  it("keeps every page and adds the Visd AR author marks", async () => {
    const source = await PDFDocument.create();
    const font = await source.embedFont(StandardFonts.Helvetica);
    for (let index = 0; index < 2; index += 1) {
      const page = source.addPage([595.28, 841.89]);
      page.drawRectangle({ x: 36, y: 36, width: 523.28, height: 769.89, color: rgb(0.98, 0.97, 1) });
      page.drawText(`Page de lecture ${index + 1}`, { x: 76, y: 720, size: 28, font, color: rgb(0.12, 0.16, 0.27) });
      page.drawText("Sinogrammes, pinyin et traduction francaise", { x: 76, y: 675, size: 14, font });
    }
    const sourceBytes = await source.save();
    const logoBytes = await readFile(path.join(process.cwd(), "public/images/logo.png"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(logoBytes, { status: 200, headers: { "Content-Type": "image/png" } })));

    const input = new File([new Uint8Array(sourceBytes)], "lecture.pdf", { type: "application/pdf" });
    const output = await addVisdArAuthorWatermark(input);
    const outputBytes = new Uint8Array(await output.arrayBuffer());
    const verified = await PDFDocument.load(outputBytes);

    expect(output.name).toBe(input.name);
    expect(output.type).toBe("application/pdf");
    expect(verified.getPageCount()).toBe(2);
    expect(output.size).toBeGreaterThan(input.size);

    if (process.env.VISDAR_WRITE_WATERMARK_PREVIEW === "1") {
      const previewDir = path.join(process.cwd(), "tmp/pdfs");
      await mkdir(previewDir, { recursive: true });
      await writeFile(path.join(previewDir, "watermark-preview.pdf"), outputBytes);
    }
  });
});
