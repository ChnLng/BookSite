import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/database-identifiers";
import {
  canViewMimeType,
  deliveryModeAllowed,
  extensionFromFilename,
  normalizeAllowedFileTypes,
  normalizeDeliveryModes,
  type DocumentDeliveryMode,
  type ProductKind,
} from "@/lib/product-documents";

export const productDocumentSelect =
  "id, product_kind, book_id, resource_id, category_id, label_fr, label_zh, file_name, file_extension, mime_type, size_bytes, asset_reference, delivery_mode, visible, sort_order, version, deleted_at";

export async function resolveDocumentProduct(
  supabase: SupabaseClient,
  productKind: ProductKind,
  productRef: string,
) {
  const table = (productKind === "book" ? "books" : "resource_items") as string;
  const select = (productKind === "book"
    ? "id, slug, category_id, title_fr, title_zh, visible, deleted_at"
    : "id, slug, category_id, title_fr, visible, deleted_at") as string;
  const query = supabase.from(table).select(select).limit(1);
  const { data, error } = isUuid(productRef)
    ? await query.eq("id", productRef).maybeSingle()
    : await query.eq("slug", productRef).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    slug: string | null;
    category_id: string | null;
    title_fr: string | null;
    title_zh?: string | null;
    visible: boolean | null;
    deleted_at: string | null;
  };
  return {
    id: String(row.id),
    slug: String(row.slug || row.id),
    categoryId: row.category_id ? String(row.category_id) : null,
    title: String(row.title_fr || row.title_zh || row.slug || "Produit"),
    visible: row.visible !== false,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

export async function resolveCategoryDocumentRules(
  supabase: SupabaseClient,
  categoryId: string | null,
  productKind: ProductKind,
) {
  if (categoryId) {
    const { data, error } = await supabase
      .from("categories")
      .select("id, allowed_file_types, allowed_delivery_modes")
      .eq("id", categoryId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) {
      return {
        categoryId: String(data.id),
        allowedFileTypes: normalizeAllowedFileTypes(data.allowed_file_types),
        allowedDeliveryModes: normalizeDeliveryModes(data.allowed_delivery_modes),
      };
    }
  }

  return {
    categoryId: null,
    allowedFileTypes: productKind === "book"
      ? [".pdf", ".epub", ".zip", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md"]
      : [
          ".pdf", ".epub", ".zip", ".7z", ".rar", ".svg", ".png", ".jpg", ".jpeg", ".webp",
          ".txt", ".md", ".csv", ".json", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
          ".fbx", ".glb", ".gltf", ".obj", ".stl", ".blend", ".usdz", ".dwg", ".dxf",
          ".mp3", ".wav", ".mp4", ".mov", ".webm", ".exe", ".dmg", ".apk",
        ],
    allowedDeliveryModes: ["download", "view"] as Array<"download" | "view">,
  };
}

export function validateDocumentAgainstRules(input: {
  fileName: string;
  mimeType?: string;
  deliveryMode: DocumentDeliveryMode;
  allowedFileTypes: string[];
  allowedDeliveryModes: Array<"download" | "view">;
}) {
  const extension = extensionFromFilename(input.fileName);
  if (!extension) throw new Error("Le fichier doit avoir une extension valide.");
  if (input.allowedFileTypes.length > 0 && !input.allowedFileTypes.includes(extension)) {
    throw new Error(`Format ${extension} interdit pour cette catégorie. Formats autorisés : ${input.allowedFileTypes.join(", ")}.`);
  }
  if (!deliveryModeAllowed(input.deliveryMode, input.allowedDeliveryModes)) {
    throw new Error("Ce mode de livraison n'est pas autorisé pour cette catégorie.");
  }
  if (
    (input.deliveryMode === "view" || input.deliveryMode === "both")
    && !canViewMimeType(input.mimeType || "application/octet-stream", extension)
  ) {
    throw new Error(`Le format ${extension} ne peut pas être lu directement dans le navigateur. Choisissez le téléchargement.`);
  }
  return extension;
}
