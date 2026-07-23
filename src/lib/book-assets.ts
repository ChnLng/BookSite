export const siteLogoPath = "/images/logo.png";

export function bookCoverPath(slug: string, extension: "jpg" | "png" = "jpg") {
  return `/images/${slug}_cover.${extension}`;
}

export function bookPdfPath(slug: string) {
  return `/images/${slug}_book.pdf`;
}

export const bookAssetExtensions: Record<string, "jpg" | "png"> = {
  lumi: "jpg",
  jiti: "jpg",
  taogao: "jpg",
  fulbert: "png",
};
