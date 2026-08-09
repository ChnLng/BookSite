import { degrees, PDFDocument, StandardFonts, rgb } from "pdf-lib";

const logoPath = "/images/site-icon-512.png";

export const maxPdfWatermarkBytes = 80 * 1024 * 1024;

export function isPdfUpload(file: Pick<File, "name" | "type">) {
  return file.type.toLowerCase() === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function loadWatermarkLogo() {
  const response = await fetch(logoPath, { cache: "force-cache" });
  if (!response.ok) throw new Error("Logo Visd AR indisponible.");
  return response.arrayBuffer();
}

export async function addVisdArAuthorWatermark(file: File) {
  if (!isPdfUpload(file)) return file;
  if (file.size > maxPdfWatermarkBytes) {
    throw new Error(
      "Ce PDF dépasse 80 Mo. Pour éviter de bloquer le navigateur, décochez la signature PDF puis recommencez l'envoi.",
    );
  }

  try {
    const [source, logoBytes] = await Promise.all([file.arrayBuffer(), loadWatermarkLogo()]);
    const pdf = await PDFDocument.load(source, { updateMetadata: false });
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const logo = await pdf.embedPng(logoBytes);

    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize();
      const fontSize = Math.min(7.4, Math.max(5.6, Math.min(width, height) / 84));
      const iconSize = fontSize * 1.55;
      const gap = fontSize * 0.72;
      const prefix = "Auteur :";
      const brand = "Visd AR";
      const prefixWidth = font.widthOfTextAtSize(prefix, fontSize);
      const brandWidth = font.widthOfTextAtSize(brand, fontSize);
      const totalLength = prefixWidth + gap + iconSize + gap * 0.72 + brandWidth;
      const leftX = fontSize + 4;
      const leftStartY = Math.max(14, (height - totalLength) / 2);
      const rightX = width - fontSize - 4;
      const rightStartY = Math.min(height - 14, (height + totalLength) / 2);

      page.drawText(prefix, {
        x: leftX,
        y: leftStartY,
        size: fontSize,
        font,
        color: rgb(0.38, 0.46, 0.62),
        opacity: 0.48,
        rotate: degrees(90),
      });
      page.drawImage(logo, {
        x: leftX,
        y: leftStartY + prefixWidth + gap,
        width: iconSize,
        height: iconSize,
        opacity: 0.64,
        rotate: degrees(90),
      });
      page.drawText(brand, {
        x: leftX,
        y: leftStartY + prefixWidth + gap + iconSize + gap * 0.72,
        size: fontSize,
        font,
        color: rgb(0.36, 0.43, 0.60),
        opacity: 0.52,
        rotate: degrees(90),
      });

      page.drawText(prefix, {
        x: rightX,
        y: rightStartY,
        size: fontSize,
        font,
        color: rgb(0.38, 0.46, 0.62),
        opacity: 0.48,
        rotate: degrees(-90),
      });
      page.drawImage(logo, {
        x: rightX,
        y: rightStartY - prefixWidth - gap,
        width: iconSize,
        height: iconSize,
        opacity: 0.64,
        rotate: degrees(-90),
      });
      page.drawText(brand, {
        x: rightX,
        y: rightStartY - prefixWidth - gap - iconSize - gap * 0.72,
        size: fontSize,
        font,
        color: rgb(0.36, 0.43, 0.60),
        opacity: 0.52,
        rotate: degrees(-90),
      });
    }

    const bytes = await pdf.save({ useObjectStreams: true });
    return new File([new Uint8Array(bytes)], file.name, {
      type: "application/pdf",
      lastModified: file.lastModified,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "PDF illisible";
    throw new Error(
      `Impossible d'ajouter la signature « Auteur : Visd AR » (${detail}). Décochez la signature PDF pour envoyer le fichier original.`,
    );
  }
}
