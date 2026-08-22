export type ProductKind = "book" | "resource";
export type DocumentDeliveryMode = "download" | "view" | "both";

export const adminUploadStagingBucketName = "admin-upload-staging";
export const githubReleaseMaxAssetBytes = 2 * 1024 * 1024 * 1024 - 1;

// Android packages can be delivered directly after purchase. Apple uses the
// same IPA package for iPhone and iPad; its installation still requires an
// Apple-approved signing/distribution method outside the website.
export const mobileAppPackageExtensions = [".apk", ".aab", ".apks", ".xapk", ".ipa"] as const;

export type ProductDocumentRecord = {
  id: string;
  product_kind: ProductKind;
  book_id: string | null;
  resource_id: string | null;
  category_id: string | null;
  label_fr: string;
  label_zh: string | null;
  file_name: string;
  file_extension: string;
  mime_type: string;
  size_bytes: number | string;
  asset_reference: string;
  delivery_mode: DocumentDeliveryMode;
  visible: boolean;
  sort_order: number;
  version: number;
  deleted_at: string | null;
};

export type PublicProductDocument = {
  id: string;
  labelFr: string;
  labelZh: string;
  fileName: string;
  fileExtension: string;
  mimeType: string;
  sizeBytes: number;
  deliveryMode: DocumentDeliveryMode;
  sortOrder: number;
};

export function normalizeExtension(value?: string | null) {
  const trimmed = String(value || "").trim().toLowerCase();
  if (!trimmed) return "";
  const extension = trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
  return /^\.[a-z0-9]{1,16}$/.test(extension) ? extension : "";
}
export function extensionFromFilename(fileName: string) {
  const cleanName = fileName.split(/[?#]/, 1)[0];
  const match = cleanName.match(/\.([a-z0-9]{1,16})$/i);
  return match ? normalizeExtension(match[1]) : "";
}

export function normalizeAllowedFileTypes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((entry) => normalizeExtension(String(entry))).filter(Boolean)));
}

export function normalizeDeliveryModes(value: unknown): Array<"download" | "view"> {
  if (!Array.isArray(value)) return ["download"];
  const modes = value.filter((entry): entry is "download" | "view" => entry === "download" || entry === "view");
  return modes.length > 0 ? Array.from(new Set(modes)) : ["download"];
}

export function deliveryModeAllowed(
  mode: DocumentDeliveryMode,
  allowedModes: Array<"download" | "view">,
) {
  if (mode === "both") return allowedModes.includes("download") && allowedModes.includes("view");
  return allowedModes.includes(mode);
}

export function canViewMimeType(mimeType: string, extension: string) {
  const normalizedMime = mimeType.toLowerCase();
  const normalizedExtension = normalizeExtension(extension);
  return (
    normalizedMime === "application/pdf" ||
    normalizedMime.startsWith("image/") ||
    normalizedMime.startsWith("text/") ||
    [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".txt", ".md", ".csv", ".json"].includes(normalizedExtension)
  );
}

export function isPdfDocument(document: Pick<PublicProductDocument, "mimeType" | "fileExtension">) {
  return document.mimeType.toLowerCase() === "application/pdf" || normalizeExtension(document.fileExtension) === ".pdf";
}

export function preferredOnlineViewDocument(documents: PublicProductDocument[]) {
  const viewable = documents.filter((document) => (
    document.deliveryMode !== "download" && canViewMimeType(document.mimeType, document.fileExtension)
  ));
  return viewable.find(isPdfDocument) || viewable[0] || null;
}

export function safeDownloadFilename(fileName: string) {
  return fileName.trim().replace(/["\\\r\n/]/g, "-") || "document";
}
